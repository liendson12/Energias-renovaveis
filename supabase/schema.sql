-- =====================================================================
-- Energia Renovável MZ — esquema Supabase
-- Cole TUDO no SQL Editor do Supabase e clique em "Run".
-- Regra de ouro: o cliente NUNCA altera saldos diretamente.
-- Todas as operações de dinheiro passam por funções (RPC) validadas aqui.
-- =====================================================================

-- ---------- TABELAS ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique check (phone ~ '^258(8[2-7])[0-9]{7}$'),
  invite_code text not null unique,
  invited_by uuid references public.profiles(id),
  balance numeric(14,2) not null default 0 check (balance >= 0),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create sequence public.project_seq;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  category text not null check (category in ('Solar','Eólica','Hídrica','Biomassa')),
  location text not null,
  capacity text not null default '',
  description text not null default '',
  docs text not null default '',
  rate numeric(5,2) not null check (rate > 0 and rate <= 25),          -- % ao ano, teto 25%
  term_days int not null check (term_days >= 30),
  price numeric(14,2) not null check (price >= 50),                    -- preço por título
  goal numeric(14,2) not null check (goal >= price),
  raised numeric(14,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_at timestamptz not null default now(),
  -- só se publica com documentação descrita
  constraint docs_required check (status = 'draft' or length(docs) >= 20)
);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid not null references public.projects(id),
  project_name text not null,
  qty int not null check (qty > 0),
  amount numeric(14,2) not null check (amount > 0),
  rate numeric(5,2) not null,
  term_days int not null,
  start_at timestamptz not null default now(),
  redeemed boolean not null default false,
  redeemed_at timestamptz,
  payout numeric(14,2)
);
create index on public.investments (user_id);

create table public.payment_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  holder text not null default '',
  number text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  channel text not null,
  amount numeric(14,2) not null check (amount >= 50),
  ref text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
-- o mesmo ID de transação não pode ser usado duas vezes
create unique index deposits_ref_uq on public.deposits (lower(channel), lower(ref));

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  channel text not null,
  number text not null,
  amount numeric(14,2) not null check (amount >= 100),
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type text not null,
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);
create index on public.transactions (user_id, created_at desc);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_at timestamptz not null default now()
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  whatsapp text not null default '',
  group_link text not null default '',
  domain text not null default 'https://suaplataforma.co.mz'
);

-- ---------- FUNÇÕES AUXILIARES ----------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.set_project_code()
returns trigger language plpgsql as $$
begin
  if new.code is null then
    new.code := upper(left(new.category, 1)) || '-' || lpad(nextval('public.project_seq')::text, 2, '0');
  end if;
  return new;
end $$;

create trigger trg_project_code before insert on public.projects
  for each row execute function public.set_project_code();

-- Cria o perfil quando alguém se regista (telefone vem dos metadados do signUp)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_phone text := new.raw_user_meta_data->>'phone';
  v_code text := upper(coalesce(new.raw_user_meta_data->>'invite_code', ''));
  v_inviter uuid;
  v_invite text;
begin
  if v_phone is null or v_phone !~ '^258(8[2-7])[0-9]{7}$' then
    raise exception 'Número de telefone inválido';
  end if;
  if v_code <> '' then
    select id into v_inviter from public.profiles where invite_code = v_code;
  end if;
  loop
    v_invite := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.profiles where invite_code = v_invite);
  end loop;
  insert into public.profiles (id, phone, invite_code, invited_by)
  values (new.id, v_phone, v_invite, v_inviter);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- SEGURANÇA ao nível da linha (RLS) ----------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.investments enable row level security;
alter table public.payment_channels enable row level security;
alter table public.deposits enable row level security;
alter table public.withdrawals enable row level security;
alter table public.transactions enable row level security;
alter table public.notices enable row level security;
alter table public.settings enable row level security;

-- Perfis: cada um vê o seu; o admin vê todos. Ninguém altera por aqui (saldo protegido).
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Projetos: clientes veem publicados/encerrados; admin vê e edita tudo.
create policy projects_select on public.projects for select to authenticated
  using (status in ('published','closed') or public.is_admin());
create policy projects_admin on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Dados financeiros: só leitura do próprio; escrita só via funções.
create policy investments_select on public.investments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy deposits_select on public.deposits for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy withdrawals_select on public.withdrawals for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy transactions_select on public.transactions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Canais de pagamento
create policy channels_select on public.payment_channels for select to authenticated
  using (active or public.is_admin());
create policy channels_admin on public.payment_channels for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Avisos
create policy notices_select on public.notices for select to authenticated using (true);
create policy notices_admin on public.notices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Definições
create policy settings_select on public.settings for select to authenticated using (true);
create policy settings_admin on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- FUNÇÕES DE NEGÓCIO (RPC) ----------

-- Verifica se um código de convite existe (pode ser chamada antes do registo)
create or replace function public.check_invite(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where invite_code = upper(trim(p_code)))
$$;

-- Lista os meus convidados (número mascarado)
create or replace function public.my_referrals()
returns table (phone text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select left(p.phone, 5) || '****' || right(p.phone, 3), p.created_at
  from public.profiles p
  where p.invited_by = auth.uid()
  order by p.created_at desc
$$;

-- Comprar títulos
create or replace function public.invest(p_project uuid, p_qty int)
returns void language plpgsql security definer set search_path = public as $$
declare
  pr public.projects;
  u public.profiles;
  v_cost numeric;
begin
  if auth.uid() is null then raise exception 'Sessão inválida'; end if;
  if p_qty is null or p_qty < 1 then raise exception 'Quantidade inválida'; end if;

  select * into pr from public.projects where id = p_project for update;
  if not found or pr.status <> 'published' then raise exception 'Projeto indisponível'; end if;

  v_cost := p_qty * pr.price;
  if pr.raised + v_cost > pr.goal then
    raise exception 'O projeto não tem tantos títulos disponíveis';
  end if;

  select * into u from public.profiles where id = auth.uid() for update;
  if u.balance < v_cost then raise exception 'Saldo insuficiente. Faça um depósito primeiro.'; end if;

  update public.profiles set balance = balance - v_cost where id = u.id;
  update public.projects set raised = raised + v_cost where id = pr.id;
  insert into public.investments (user_id, project_id, project_name, qty, amount, rate, term_days)
    values (u.id, pr.id, pr.name, p_qty, v_cost, pr.rate, pr.term_days);
  insert into public.transactions (user_id, type, amount) values (u.id, 'Investimento', -v_cost);
end $$;

-- Resgatar capital + rendimento (só no fim do prazo)
create or replace function public.redeem(p_inv uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  i public.investments;
  v_payout numeric;
begin
  if auth.uid() is null then raise exception 'Sessão inválida'; end if;
  select * into i from public.investments where id = p_inv and user_id = auth.uid() for update;
  if not found then raise exception 'Título não encontrado'; end if;
  if i.redeemed then raise exception 'Este título já foi resgatado'; end if;
  if now() < i.start_at + make_interval(days => i.term_days) then
    raise exception 'Este título ainda não chegou ao fim do prazo';
  end if;

  v_payout := round(i.amount + i.amount * i.rate / 100 * i.term_days / 365, 2);
  update public.investments set redeemed = true, redeemed_at = now(), payout = v_payout where id = i.id;
  update public.profiles set balance = balance + v_payout where id = i.user_id;
  insert into public.transactions (user_id, type, amount) values (i.user_id, 'Resgate', v_payout);
end $$;

-- Pedir depósito (fica pendente até o admin confirmar o dinheiro)
create or replace function public.request_deposit(p_channel text, p_amount numeric, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sessão inválida'; end if;
  if p_amount is null or p_amount < 50 then raise exception 'O depósito mínimo é 50 MZN'; end if;
  if p_ref is null or length(trim(p_ref)) < 4 then raise exception 'Introduza o ID da transação'; end if;
  if not exists (select 1 from public.payment_channels where name = p_channel and active) then
    raise exception 'Canal de pagamento inválido';
  end if;
  insert into public.deposits (user_id, channel, amount, ref)
    values (auth.uid(), p_channel, p_amount, trim(p_ref));
exception when unique_violation then
  raise exception 'Este ID de transação já foi usado';
end $$;

-- Pedir levantamento (o valor sai do saldo já; se for rejeitado, volta)
create or replace function public.request_withdrawal(p_channel text, p_number text, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare u public.profiles;
begin
  if auth.uid() is null then raise exception 'Sessão inválida'; end if;
  if p_amount is null or p_amount < 100 then raise exception 'O levantamento mínimo é 100 MZN'; end if;
  if p_number !~ '^[0-9]{9}$' then raise exception 'Número de recebimento inválido'; end if;
  select * into u from public.profiles where id = auth.uid() for update;
  if u.balance < p_amount then raise exception 'Saldo insuficiente'; end if;
  update public.profiles set balance = balance - p_amount where id = u.id;
  insert into public.withdrawals (user_id, channel, number, amount) values (u.id, p_channel, p_number, p_amount);
end $$;

-- ADMIN: aprovar/rejeitar depósito
create or replace function public.admin_review_deposit(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare d public.deposits;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select * into d from public.deposits where id = p_id for update;
  if not found or d.status <> 'pending' then raise exception 'Depósito não está pendente'; end if;
  update public.deposits
    set status = case when p_approve then 'approved' else 'rejected' end, reviewed_at = now()
    where id = d.id;
  if p_approve then
    update public.profiles set balance = balance + d.amount where id = d.user_id;
    insert into public.transactions (user_id, type, amount) values (d.user_id, 'Depósito', d.amount);
  end if;
end $$;

-- ADMIN: marcar levantamento como pago, ou rejeitar (devolve ao saldo)
create or replace function public.admin_review_withdrawal(p_id uuid, p_paid boolean)
returns void language plpgsql security definer set search_path = public as $$
declare w public.withdrawals;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  select * into w from public.withdrawals where id = p_id for update;
  if not found or w.status <> 'pending' then raise exception 'Levantamento não está pendente'; end if;
  update public.withdrawals
    set status = case when p_paid then 'paid' else 'rejected' end, reviewed_at = now()
    where id = w.id;
  if p_paid then
    insert into public.transactions (user_id, type, amount) values (w.user_id, 'Levantamento', -w.amount);
  else
    update public.profiles set balance = balance + w.amount where id = w.user_id;
  end if;
end $$;

-- ADMIN: resumo
create or replace function public.admin_summary()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return json_build_object(
    'users', (select count(*) from public.profiles),
    'invested', coalesce((select sum(amount) from public.investments where not redeemed), 0),
    'balances', coalesce((select sum(balance) from public.profiles), 0),
    'owed', coalesce((select sum(amount + amount * rate / 100 * term_days / 365)
                      from public.investments where not redeemed), 0)
  );
end $$;

-- ADMIN: lista de utilizadores
create or replace function public.admin_users()
returns table (id uuid, phone text, balance numeric, is_adm boolean, created_at timestamptz,
               invited_count bigint, invested numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return query
    select p.id, p.phone, p.balance, p.is_admin, p.created_at,
           (select count(*) from public.profiles x where x.invited_by = p.id),
           coalesce((select sum(i.amount) from public.investments i where i.user_id = p.id and not i.redeemed), 0)
    from public.profiles p
    order by p.created_at desc;
end $$;

-- ---------- PERMISSÕES DAS FUNÇÕES ----------
revoke all on function public.invest(uuid, int) from public, anon;
revoke all on function public.redeem(uuid) from public, anon;
revoke all on function public.request_deposit(text, numeric, text) from public, anon;
revoke all on function public.request_withdrawal(text, text, numeric) from public, anon;
revoke all on function public.admin_review_deposit(uuid, boolean) from public, anon;
revoke all on function public.admin_review_withdrawal(uuid, boolean) from public, anon;
revoke all on function public.admin_summary() from public, anon;
revoke all on function public.admin_users() from public, anon;
revoke all on function public.my_referrals() from public, anon;

grant execute on function public.invest(uuid, int) to authenticated;
grant execute on function public.redeem(uuid) to authenticated;
grant execute on function public.request_deposit(text, numeric, text) to authenticated;
grant execute on function public.request_withdrawal(text, text, numeric) to authenticated;
grant execute on function public.admin_review_deposit(uuid, boolean) to authenticated;
grant execute on function public.admin_review_withdrawal(uuid, boolean) to authenticated;
grant execute on function public.admin_summary() to authenticated;
grant execute on function public.admin_users() to authenticated;
grant execute on function public.my_referrals() to authenticated;
grant execute on function public.check_invite(text) to anon, authenticated;

-- ---------- DADOS INICIAIS ----------
insert into public.settings (id) values (1);

insert into public.payment_channels (name, holder, number) values
  ('M-Pesa', 'Nome do titular', '84 000 0000'),
  ('E-Mola', 'Nome do titular', '86 000 0000');

insert into public.notices (text) values
  ('Bem-vindo! Aqui pode investir em projetos reais de energia renovável em Moçambique. Leia sempre a documentação de cada projeto antes de investir.');

-- Exemplos em rascunho: edite no painel de administração antes de publicar
insert into public.projects (name, category, location, capacity, description, rate, term_days, price, goal) values
  ('EXEMPLO — Solar comunitário', 'Solar', 'Província', '250 kW', 'Descreva o projeto real aqui.', 12, 180, 500, 500000),
  ('EXEMPLO — Mini-hídrica', 'Hídrica', 'Província', '800 kW', 'Descreva o projeto real aqui.', 14, 365, 1000, 1200000);
