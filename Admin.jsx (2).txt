import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { fmt, dt, CATS, MAX_RATE, MIN_TERM, ST } from "./lib";
import { Field, Tag, ImagePicker } from "./ui.jsx";
import { Icon } from "./Icon.jsx";

export default function Admin({ A }) {
  const { say, setAdminOpen } = A;
  const [t, setT] = useState("sum");
  const [D, setD] = useState(null);

  const load = async () => {
    const res = await Promise.all([
      supabase.rpc("admin_summary"),
      supabase.rpc("admin_users"),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("deposits").select("*, profiles(phone)").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*, profiles(phone)").order("created_at", { ascending: false }),
      supabase.from("payment_channels").select("*").order("created_at"),
      supabase.from("notices").select("*").order("created_at", { ascending: false }),
      supabase.from("settings").select("*").eq("id", 1).single(),
    ]);
    const failed = res.find((r) => r.error);
    if (failed) return say(failed.error.message, true);
    const [sum, users, projects, deps, wds, chans, notices, settings] = res.map((r) => r.data);
    setD({ sum, users, projects, deps, wds, chans, notices, settings });
  };
  useEffect(() => { load(); }, []);

  // Executa uma ação de admin, avisa e recarrega tudo
  const act = async (fn, okMsg) => {
    const r = await fn();
    if (r.error) { say(r.error.message, true); return false; }
    if (okMsg) say(okMsg);
    await load();
    await A.refresh();
    return true;
  };

  const tabs = [["sum", "Resumo"], ["proj", "Projetos"], ["dep", "Depósitos"], ["wd", "Levantamentos"], ["usr", "Utilizadores"], ["ch", "Canais"], ["not", "Notícias"], ["set", "Definições"]];
  const pendDep = D ? D.deps.filter((d) => d.status === "pending").length : 0;
  const pendWd = D ? D.wds.filter((d) => d.status === "pending").length : 0;
  const P = { D, act, say };

  return (
    <div className="admin">
      <div className="in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}><Icon n="shield" s={22} /> Administração</h2>
          <button className="btn dark sm" onClick={() => setAdminOpen(false)}>Fechar</button>
        </div>
        <div className="tabs">
          {tabs.map(([k, l]) => (
            <button key={k} className={t === k ? "on" : ""} onClick={() => setT(k)}>
              {l}{k === "dep" && pendDep ? ` (${pendDep})` : ""}{k === "wd" && pendWd ? ` (${pendWd})` : ""}
            </button>
          ))}
        </div>
        {!D ? <div className="muted">A carregar…</div> : (
          <>
            {t === "sum" && <ASummary {...P} />}
            {t === "proj" && <AProjects {...P} />}
            {t === "dep" && <ADeposits {...P} />}
            {t === "wd" && <AWithdrawals {...P} />}
            {t === "usr" && <AUsers {...P} />}
            {t === "ch" && <AChannels {...P} />}
            {t === "not" && <ANotices {...P} />}
            {t === "set" && <ASettings {...P} />}
          </>
        )}
      </div>
    </div>
  );
}

function ASummary({ D }) {
  const s = D.sum;
  return (
    <>
      <div className="stat">
        <div>Utilizadores<b>{s.users}</b></div>
        <div>Capital investido ativo<b>{fmt(s.invested, 0)} MZN</b></div>
        <div>Saldos dos clientes<b>{fmt(s.balances, 0)} MZN</b></div>
        <div>A pagar até ao vencimento<b>{fmt(s.owed, 0)} MZN</b></div>
      </div>
      <div className="warn">
        Confirme sempre que as receitas reais dos projetos cobrem o valor “a pagar até ao vencimento”. Pagar rendimentos com depósitos de novos clientes não é sustentável nem legal.
      </div>
    </>
  );
}

function AProjects({ D, act, say }) {
  const [f, setF] = useState(null);
  const blank = { id: null, name: "", category: "Solar", location: "", capacity: "", description: "", docs: "", image_url: "", rate: MAX_RATE, term_days: 30, price: 500, goal: 100000, status: "draft" };
  const set = (k, v) => setF({ ...f, [k]: v });

  const save = async () => {
    const rate = Number(f.rate), term = Number(f.term_days), price = Number(f.price), goal = Number(f.goal);
    if (!f.name.trim() || !f.location.trim()) return say("Preencha o nome e a localização.", true);
    if (!(rate > 0) || rate > MAX_RATE) return say(`O rendimento anual tem de estar entre 0,1% e ${MAX_RATE}%.`, true);
    if (!Number.isInteger(term) || term < MIN_TERM) return say(`O prazo mínimo é ${MIN_TERM} dias.`, true);
    if (!(price >= 50) || !(goal >= price)) return say("Verifique o preço do título e a meta.", true);
    if (f.status !== "draft" && f.docs.trim().length < 20)
      return say("Para publicar, descreva a documentação do projeto (licenças, contratos, relatórios).", true);
    const body = {
      name: f.name.trim(), category: f.category, location: f.location.trim(), capacity: f.capacity,
      description: f.description, docs: f.docs, image_url: f.image_url || null, rate, term_days: term, price, goal, status: f.status,
    };
    const ok = await act(
      () => (f.id ? supabase.from("projects").update(body).eq("id", f.id) : supabase.from("projects").insert(body)),
      "Projeto guardado."
    );
    if (ok) setF(null);
  };

  if (f)
    return (
      <div className="card">
        <h3 style={{ margin: 0 }}>{f.id ? "Editar projeto" : "Novo projeto"}</h3>
        <Field label="Imagem do título (opcional)"><ImagePicker value={f.image_url} onChange={(v) => set("image_url", v)} folder="projects" say={say} /></Field>
        <Field label="Nome"><input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Tipo">
          <select value={f.category} onChange={(e) => set("category", e.target.value)}>
            {Object.keys(CATS).map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Localização"><input value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Capacidade (ex.: 250 kW)"><input value={f.capacity} onChange={(e) => set("capacity", e.target.value)} /></Field>
        <Field label="Descrição"><textarea value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Documentação (licenças, contratos, relatórios)"><textarea value={f.docs} onChange={(e) => set("docs", e.target.value)} /></Field>
        <Field label={`Rendimento previsto ao ano (%) · máx. ${MAX_RATE}%`}><input inputMode="decimal" value={f.rate} onChange={(e) => set("rate", e.target.value)} /></Field>
        <Field label={`Prazo (dias) · mín. ${MIN_TERM}`}><input inputMode="numeric" value={f.term_days} onChange={(e) => set("term_days", e.target.value)} /></Field>
        <Field label="Preço por título (MZN)"><input inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Meta de captação (MZN)"><input inputMode="numeric" value={f.goal} onChange={(e) => set("goal", e.target.value)} /></Field>
        <Field label="Estado">
          <select value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="draft">rascunho (invisível)</option>
            <option value="published">publicado</option>
            <option value="closed">encerrado</option>
          </select>
        </Field>
        <div style={{ height: 16 }} />
        <button className="btn" onClick={save}>Guardar</button>
        <div style={{ height: 10 }} />
        <button className="btn dark" onClick={() => setF(null)}>Cancelar</button>
      </div>
    );

  return (
    <>
      <button className="btn" onClick={() => setF(blank)}><Icon n="plus" s={20} /> Novo projeto</button>
      {D.projects.map((p) => (
        <div className="card" key={p.id}>
          {p.image_url && <img className="thumb" src={p.image_url} alt="" />}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b>{p.code} · {p.name}</b><span className="tag pend">{ST[p.status]}</span>
          </div>
          <div className="muted" style={{ margin: "6px 0" }}>
            {fmt(p.rate, 1)}% ao ano · {p.term_days} dias · {fmt(p.raised, 0)}/{fmt(p.goal, 0)} MZN
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={() => setF({ ...p })}>Editar</button>
            {p.status === "published" && (
              <button
                className="btn sm alt"
                onClick={() => {
                  if (window.confirm(`Encerrar "${p.name}" e pagar já todos os investidores (capital + rendimento acumulado até agora)? Não pode ser desfeito.`))
                    act(() => supabase.rpc("admin_close_project", { p_project: p.id }), "Projeto encerrado. Investidores pagos.");
                }}
              >Encerrar e pagar</button>
            )}
            <button
              className="btn sm red"
              onClick={() => {
                if (Number(p.raised) > 0) return say("Já há investimentos neste projeto. Encerre-o em vez de apagar.", true);
                if (window.confirm("Apagar este projeto?")) act(() => supabase.from("projects").delete().eq("id", p.id), "Projeto apagado.");
              }}
            >Apagar</button>
          </div>
        </div>
      ))}
    </>
  );
}

function ADeposits({ D, act }) {
  return (
    <>
      <div className="warn">Confirme no seu M-Pesa/E-Mola que o dinheiro e o ID da transação existem antes de aprovar.</div>
      {D.deps.length === 0 && <div className="card muted">Sem depósitos.</div>}
      {D.deps.map((d) => (
        <div className="card" key={d.id}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><b>{fmt(d.amount)} MZN · {d.channel}</b><Tag s={d.status} /></div>
          <div className="muted" style={{ margin: "6px 0" }}>{d.profiles?.phone} · ID: {d.ref}<br />{dt(d.created_at)}</div>
          {d.status === "pending" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn sm" onClick={() => act(() => supabase.rpc("admin_review_deposit", { p_id: d.id, p_approve: true }), "Depósito aprovado.")}>Aprovar</button>
              <button className="btn sm red" onClick={() => act(() => supabase.rpc("admin_review_deposit", { p_id: d.id, p_approve: false }), "Depósito rejeitado.")}>Rejeitar</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function AWithdrawals({ D, act }) {
  return (
    <>
      {D.wds.length === 0 && <div className="card muted">Sem pedidos de levantamento.</div>}
      {D.wds.map((w) => (
        <div className="card" key={w.id}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><b>{fmt(w.amount)} MZN · {w.channel}</b><Tag s={w.status} /></div>
          <div className="muted" style={{ margin: "6px 0" }}>Pagar a: {w.number}<br />Conta: {w.profiles?.phone} · {dt(w.created_at)}</div>
          {w.status === "pending" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn sm" onClick={() => act(() => supabase.rpc("admin_review_withdrawal", { p_id: w.id, p_paid: true }), "Marcado como pago.")}>Marcar como pago</button>
              <button className="btn sm red" onClick={() => act(() => supabase.rpc("admin_review_withdrawal", { p_id: w.id, p_paid: false }), "Rejeitado. Valor devolvido ao saldo.")}>Rejeitar</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function AUsers({ D }) {
  return (
    <div className="card">
      {D.users.map((u) => (
        <div className="row" key={u.id}>
          <div>
            <b>{u.phone}</b>{u.is_adm && " (admin)"}
            <div className="muted">Convidou {u.invited_count} · {dt(u.created_at)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>{fmt(u.balance)} MZN</div>
            <div className="muted">investido {fmt(u.invested, 0)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChannelCard({ c, act }) {
  const [v, setV] = useState(c);
  const set = (k, val) => setV({ ...v, [k]: val });
  const save = () => act(() => supabase.from("payment_channels").update({ name: v.name, holder: v.holder, number: v.number, active: v.active }).eq("id", c.id), "Canal guardado.");
  return (
    <div className="card">
      <Field label="Nome do canal"><input value={v.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Titular da conta"><input value={v.holder} onChange={(e) => set("holder", e.target.value)} /></Field>
      <Field label="Número"><input value={v.number} onChange={(e) => set("number", e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button className={"btn sm " + (v.active ? "" : "dark")} onClick={() => set("active", !v.active)}>{v.active ? "Ativo" : "Inativo"}</button>
        <button className="btn sm" onClick={save}>Guardar</button>
        <button className="btn sm red" onClick={() => window.confirm("Remover este canal?") && act(() => supabase.from("payment_channels").delete().eq("id", c.id), "Canal removido.")}>Remover</button>
      </div>
    </div>
  );
}

function AChannels({ D, act }) {
  return (
    <>
      <div className="muted">Estes dados aparecem aos clientes no ecrã de depósito.</div>
      {D.chans.map((c) => <ChannelCard key={c.id + c.name} c={c} act={act} />)}
      <button className="btn" onClick={() => act(() => supabase.from("payment_channels").insert({ name: "Novo canal", holder: "", number: "" }), "Canal adicionado.")}>Adicionar canal</button>
    </>
  );
}

function ANotices({ D, act, say }) {
  const [title, setTitle] = useState("");
  const [txt, setTxt] = useState("");
  const [img, setImg] = useState("");
  return (
    <>
      <div className="card">
        <Field label="Título (opcional)"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Nova notícia (aparece no feed do Início e em Novidades)"><textarea value={txt} onChange={(e) => setTxt(e.target.value)} /></Field>
        <Field label="Imagem (opcional)"><ImagePicker value={img} onChange={setImg} folder="news" say={say} /></Field>
        <div style={{ height: 12 }} />
        <button className="btn" onClick={async () => {
          if (!txt.trim()) return say("Escreva a notícia.", true);
          const row = { text: txt.trim(), title: title.trim() || null, image_url: img || null };
          if (await act(() => supabase.from("notices").insert(row), "Notícia publicada.")) { setTitle(""); setTxt(""); setImg(""); }
        }}>Publicar notícia</button>
      </div>
      {D.notices.map((n) => (
        <div className="card" key={n.id}>
          {n.image_url && <img className="thumb" src={n.image_url} alt="" />}
          {n.title && <b style={{ display: "block", marginBottom: 4 }}>{n.title}</b>}
          <div style={{ lineHeight: 1.5 }}>{n.text}</div>
          <div className="muted" style={{ margin: "6px 0 10px" }}>{dt(n.created_at)}</div>
          <button className="btn sm red" onClick={() => act(() => supabase.from("notices").delete().eq("id", n.id), "Notícia apagada.")}>Apagar</button>
        </div>
      ))}
    </>
  );
}

function ASettings({ D, act }) {
  const [s, setS] = useState(D.settings);
  const set = (k, v) => setS({ ...s, [k]: v });
  return (
    <div className="card">
      <Field label="WhatsApp de suporte (com 258)"><input value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))} /></Field>
      <Field label="Link do grupo WhatsApp (opcional)"><input value={s.group_link} onChange={(e) => set("group_link", e.target.value)} /></Field>
      <Field label="Domínio do site (usado nos links de convite)"><input value={s.domain} onChange={(e) => set("domain", e.target.value.replace(/\/$/, ""))} /></Field>
      <div style={{ height: 16 }} />
      <button className="btn" onClick={() => act(() => supabase.from("settings").update({ whatsapp: s.whatsapp, group_link: s.group_link, domain: s.domain }).eq("id", 1), "Definições guardadas.")}>Guardar</button>
    </div>
  );
}
