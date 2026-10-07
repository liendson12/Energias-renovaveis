# Energia Renovável MZ

App web (React + Vite) com Supabase (base de dados e login) e Vercel (alojamento).

## 1. Supabase

1. Crie um projeto em supabase.com.
2. Vá a **SQL Editor → New query**, cole todo o ficheiro `supabase/schema.sql` e clique em **Run**.
3. Vá a **Authentication → Providers → Email** e **desligue "Confirm email"**
   (o login por número usa um e-mail interno que não existe de verdade).
4. Em **Authentication → Rate Limits**, mantenha os limites de tentativas de login ativos.
5. Em **Project Settings → API**, copie o **Project URL** e a chave **anon public**.

## 2. Testar no computador (opcional)

```bash
npm install
cp .env.example .env     # preencha os 3 valores
npm run dev
```

## 3. Vercel

1. Envie esta pasta para um repositório no GitHub.
2. Em vercel.com → **Add New Project** → escolha o repositório (Framework: Vite).
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PIN_SUFFIX` (texto secreto seu; nunca o altere depois de haver utilizadores)
4. Clique em **Deploy**.

## 4. Criar o administrador

1. Abra o site e crie a sua conta normalmente (número + PIN).
2. No Supabase → SQL Editor, execute (troque pelo seu número com 258):

```sql
update public.profiles set is_admin = true where phone = '258840000000';
```

3. Recarregue o site: em **Perfil** aparece o botão **Painel de administração**.
4. No painel: edite os canais M-Pesa/E-Mola com os seus dados reais, ponha o domínio real em **Definições** e apague/edite os projetos de exemplo.

## 5. Como funciona o dinheiro

- Cliente deposita manualmente → pedido fica **pendente** → você confirma no M-Pesa/E-Mola e clica **Aprovar**.
- Compra de títulos, resgates e levantamentos são feitos por funções no servidor (`schema.sql`). O cliente não consegue alterar o próprio saldo.
- O rendimento acumula a cada minuto (taxa anual ÷ minutos do ano). Capital + rendimento só são pagos no fim do prazo.
- Levantamento: o valor sai do saldo no pedido; se rejeitar, volta ao saldo.
- Limites na base de dados: rendimento máximo 25% ao ano, prazo mínimo 30 dias, projeto só publica com documentação.

## 6. Testar um resgate sem esperar

No SQL Editor, recue a data de um título de teste:

```sql
update public.investments set start_at = now() - interval '200 days' where id = 'ID-DO-TITULO';
```

## 7. Antes de abrir ao público

- Fale com um advogado e com a entidade reguladora competente em Moçambique antes de vender títulos de investimento.
- Só publique projetos reais, com licenças, contratos e relatórios de produção.
- Confirme que as receitas dos projetos cobrem o valor "a pagar até ao vencimento" (aba Resumo).
- Ative cópias de segurança no Supabase (plano Pro) e proteja a sua conta de administrador.
- Um PIN de 4 dígitos é fraco. Para mais segurança, passe para 6 dígitos (ajuste as validações em `screens.jsx`).
