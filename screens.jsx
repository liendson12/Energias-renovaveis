import { useState } from "react";
import { supabase } from "./supabase";
import { fmt, dt, CATS, calc, normPhone, validPhone, emailOf, pwOf } from "./lib";
import { Field, Tag } from "./ui.jsx";

const pinInput = (setter) => (e) => setter(e.target.value.replace(/\D/g, ""));

/* ───────── Login / Registo ───────── */
export function Auth({ A }) {
  const { say } = A;
  const qs = new URLSearchParams(window.location.search);
  const fromLink = qs.get("c") || window.location.pathname.includes("registo");
  const [mode, setMode] = useState(fromLink ? "reg" : "login");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [code, setCode] = useState((qs.get("c") || "").toUpperCase());
  const [busy, setBusy] = useState(false);

  const login = async () => {
    const p = normPhone(phone);
    if (!validPhone(p) || pin.length !== 4) return say("Número ou PIN incorretos.", true);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: emailOf(p), password: pwOf(pin) });
    setBusy(false);
    if (error) say("Número ou PIN incorretos.", true);
  };

  const register = async () => {
    const p = normPhone(phone);
    if (!validPhone(p)) return say("Use um número moçambicano válido (ex.: 84 123 4567).", true);
    if (!/^\d{4}$/.test(pin)) return say("O PIN tem de ter 4 números.", true);
    if (pin !== pin2) return say("Os PINs não coincidem.", true);
    setBusy(true);
    if (code.trim()) {
      const { data: ok } = await supabase.rpc("check_invite", { p_code: code.trim() });
      if (!ok) { setBusy(false); return say("Código de convite inválido.", true); }
    }
    const { error } = await supabase.auth.signUp({
      email: emailOf(p),
      password: pwOf(pin),
      options: { data: { phone: p, invite_code: code.trim().toUpperCase() } },
    });
    setBusy(false);
    if (error) say(/registered|already/i.test(error.message) ? "Este número já está registado." : error.message, true);
    else say("Conta criada com sucesso.");
  };

  return (
    <div className="wrap" style={{ paddingTop: 48 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 64 }}>🌬️</div>
        <h1 style={{ margin: "8px 0 4px" }}>Energia Renovável MZ</h1>
        <div className="muted">Títulos de investimento em projetos de energia em Moçambique</div>
      </div>
      <div className="card">
        <div className="tabs" style={{ marginBottom: 8 }}>
          <button className={mode === "login" ? "on" : ""} style={{ flex: 1 }} onClick={() => setMode("login")}>Entrar</button>
          <button className={mode === "reg" ? "on" : ""} style={{ flex: 1 }} onClick={() => setMode("reg")}>Criar conta</button>
        </div>
        <Field label="Número de telefone">
          <input inputMode="numeric" placeholder="84 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="PIN (4 números)">
          <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pin} onChange={pinInput(setPin)} />
        </Field>
        {mode === "reg" && (
          <>
            <Field label="Confirmar PIN">
              <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pin2} onChange={pinInput(setPin2)} />
            </Field>
            <Field label="Código de convite (opcional)">
              <input placeholder="Ex.: SDWARZFI" value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
          </>
        )}
        <div style={{ height: 18 }} />
        <button className="btn" disabled={busy} onClick={mode === "login" ? login : register}>
          {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </div>
      <div className="muted" style={{ textAlign: "center", lineHeight: 1.5 }}>
        Investir envolve risco. O rendimento é previsto e não garantido.
      </div>
    </div>
  );
}

/* ───────── Início ───────── */
export function Home({ A }) {
  const { data, setPage, setInvest } = A;
  const notice = data.notices[0];
  return (
    <>
      {notice && <div className="notice">📢 {notice.text}</div>}
      <button className="btn" onClick={() => setPage("deposit")}>💰 Depósito</button>
      <button className="btn purple" onClick={() => setPage("withdraw")}>💸 Levantamento</button>
      <h2 style={{ margin: "8px 0 0", fontSize: 22 }}>⚡ Projetos de energia</h2>
      {data.projects.length === 0 && <div className="card muted">Ainda não há projetos publicados.</div>}
      {data.projects.map((p) => {
        const pct = Math.min(100, (p.raised / p.goal) * 100);
        const full = p.raised >= p.goal || p.status === "closed";
        return (
          <div key={p.id} className="card proj">
            <div className="banner" style={{ background: CATS[p.category].g }}>
              <span>{CATS[p.category].emoji}</span>
              <span className="badge">{p.code}</span>
            </div>
            <div className="pb">
              <h3 className="pname">{p.name}</h3>
              <div className="muted">📍 {p.location}{p.capacity ? " · " + p.capacity : ""}</div>
              <div className="price">{fmt(p.price, 0)} MZN <span className="muted" style={{ fontWeight: 400 }}>por título</span></div>
              <div style={{ lineHeight: 1.7 }}>
                <div>📈 Rendimento previsto: <b>{fmt(p.rate, 1)}% ao ano</b></div>
                <div>🗓️ Prazo: <b>{p.term_days} dias</b></div>
              </div>
              <div className="bar"><i style={{ width: pct + "%" }} /></div>
              <div className="muted">{fmt(p.raised, 0)} de {fmt(p.goal, 0)} MZN captados</div>
              <details>
                <summary>Ver descrição e documentação</summary>
                <p className="muted" style={{ lineHeight: 1.6 }}>{p.description}</p>
                <p className="muted" style={{ lineHeight: 1.6 }}><b>Documentação:</b> {p.docs}</p>
              </details>
              <div style={{ height: 14 }} />
              <button className="btn" disabled={full} onClick={() => setInvest(p)}>{full ? "Encerrado" : "Investir"}</button>
            </div>
          </div>
        );
      })}
      <div className="muted" style={{ textAlign: "center", lineHeight: 1.5 }}>
        O capital fica investido até ao fim do prazo. O rendimento acumula a cada minuto e é pago no resgate.
      </div>
    </>
  );
}

export function InvestModal({ A, proj }) {
  const { me, run, setInvest } = A;
  const [q, setQ] = useState(1);
  const [busy, setBusy] = useState(false);
  const cost = q * proj.price;
  const gain = (cost * (proj.rate / 100) * proj.term_days) / 365;
  const buy = async () => {
    setBusy(true);
    const ok = await run(() => supabase.rpc("invest", { p_project: proj.id, p_qty: q }), "Investimento realizado. O rendimento já está a contar.");
    setBusy(false);
    if (ok) setInvest(null);
  };
  return (
    <div className="modal" onClick={() => setInvest(null)}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: 22 }}>{proj.name}</h3>
        <div className="stepper">
          <button onClick={() => setQ(Math.max(1, q - 1))}>−</button>
          <b>{q}</b>
          <button onClick={() => setQ(q + 1)}>+</button>
        </div>
        <div className="row"><span className="muted">Valor a investir</span><b>{fmt(cost)} MZN</b></div>
        <div className="row"><span className="muted">Rendimento previsto no prazo</span><b style={{ color: "#00e676" }}>+{fmt(gain)} MZN</b></div>
        <div className="row"><span className="muted">Resgate previsto ({proj.term_days} dias)</span><b>{fmt(cost + gain)} MZN</b></div>
        <div className="row"><span className="muted">O seu saldo</span><b>{fmt(me.balance)} MZN</b></div>
        <div className="warn" style={{ margin: "14px 0" }}>
          O rendimento é uma previsão e não está garantido. O capital só pode ser resgatado no fim do prazo.
        </div>
        <button className="btn" disabled={busy} onClick={buy}>{busy ? "Aguarde…" : "Confirmar investimento"}</button>
      </div>
    </div>
  );
}

/* ───────── Títulos ───────── */
export function Wallet({ A }) {
  const { data, now, run } = A;
  const mine = data.invs;
  const active = mine.filter((i) => !i.redeemed);
  const pending = active.reduce((s, i) => s + calc(i, now).interest, 0);
  const collected = mine.filter((i) => i.redeemed).reduce((s, i) => s + (Number(i.payout) - Number(i.amount)), 0);
  return (
    <>
      <div className="card hero">
        <div className="muted">TOTAL RECEBIDO EM RENDIMENTOS</div>
        <div className="big">{fmt(collected)} MZN</div>
      </div>
      <div className="card" style={{ background: "#e3f5e8", color: "#14532d", textAlign: "center" }}>
        <div style={{ fontSize: 13, opacity: 0.75 }}>RENDIMENTO ACUMULADO · ATUALIZA A CADA MINUTO</div>
        <div className="big" style={{ color: "#1b7a3a" }}>{fmt(pending, 4)} MZN</div>
      </div>
      <div className="card">
        <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>📄 Os meus títulos</h3>
        {mine.length === 0 && <div className="muted">Ainda não tem títulos. Escolha um projeto no Início.</div>}
        {mine.map((i) => {
          const c = calc(i, now);
          const left = Math.max(0, Math.ceil((c.total - c.m) / 1440));
          return (
            <div key={i.id} style={{ background: "#13264a", borderRadius: 18, padding: 16, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b>{i.project_name}</b>
                {i.redeemed ? <span className="tag ok">resgatado</span> : c.matured ? <span className="tag pend">pronto a resgatar</span> : null}
              </div>
              <div className="muted" style={{ marginTop: 4 }}>{i.qty} título(s) · {fmt(i.amount)} MZN · {fmt(i.rate, 1)}% ao ano</div>
              <div className="bar"><i style={{ width: (i.redeemed ? 100 : (c.m / c.total) * 100) + "%" }} /></div>
              <div className="row" style={{ border: 0, padding: "4px 0" }}>
                <span className="muted">{i.redeemed ? "Concluído" : `Faltam ${left} dia(s)`}</span>
                <b style={{ color: "#00e676" }}>+{fmt(i.redeemed ? Number(i.payout) - Number(i.amount) : c.interest, 4)} MZN</b>
              </div>
              {!i.redeemed && (
                <button
                  className="btn sm" style={{ width: "100%", marginTop: 8 }} disabled={!c.matured}
                  onClick={() => run(() => supabase.rpc("redeem", { p_inv: i.id }), "Resgate concluído. O valor foi adicionado ao saldo.")}
                >
                  {c.matured ? "Resgatar capital + rendimento" : "Disponível no fim do prazo"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ───────── Convites ───────── */
export function Invite({ A }) {
  const { data, me, say } = A;
  const friends = data.refs;
  const link = `${data.settings.domain}/registo?c=${me.invite_code}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); say("Link copiado."); } catch (e) { say("Copie o link manualmente.", true); }
  };
  return (
    <>
      <div className="card invite">
        <div>👆 Código de convite</div>
        <div className="code">{me.invite_code}</div>
        <div>Amigos convidados: {friends.length}</div>
        <div className="copy" style={{ marginTop: 14 }}>
          <input readOnly value={link} />
          <button className="btn sm" style={{ background: "rgba(255,255,255,.25)" }} onClick={copy}>📋</button>
        </div>
      </div>
      <div className="card">
        <h3 style={{ margin: "0 0 6px", fontSize: 20 }}>🌱 Os meus convidados ({friends.length})</h3>
        {friends.length === 0 && <div className="muted" style={{ padding: "12px 0" }}>Ainda sem convidados. Partilhe o seu link.</div>}
        {friends.map((f, i) => (
          <div className="row" key={i}><span>{f.phone}</span><span className="muted">{dt(f.created_at)}</span></div>
        ))}
      </div>
      <div className="muted" style={{ lineHeight: 1.6, textAlign: "center" }}>
        Convidar amigos não gera comissões nem pagamentos. Cada pessoa investe por decisão própria.
      </div>
    </>
  );
}

/* ───────── Novidades ───────── */
export function News({ A }) {
  const { data } = A;
  return (
    <>
      {data.settings.group_link && (
        <a className="btn" style={{ textAlign: "center", textDecoration: "none", display: "block" }} href={data.settings.group_link} target="_blank" rel="noreferrer">
          Entrar no grupo WhatsApp
        </a>
      )}
      {data.notices.length === 0 && <div className="card muted">Sem novidades por agora.</div>}
      {data.notices.map((n) => (
        <div className="card" key={n.id}>
          <div style={{ lineHeight: 1.6 }}>📢 {n.text}</div>
          <div className="muted" style={{ marginTop: 8 }}>{dt(n.created_at)}</div>
        </div>
      ))}
    </>
  );
}

/* ───────── Depósito manual ───────── */
export function Deposit({ A }) {
  const { data, run, setPage } = A;
  const chans = data.chans;
  const [sel, setSel] = useState(chans[0] ? chans[0].id : null);
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const ch = chans.find((c) => c.id === sel);
  const send = async () => {
    const a = Number(amount);
    if (!ch) return A.say("Escolha um canal de pagamento.", true);
    if (!(a >= 50)) return A.say("O depósito mínimo é 50 MZN.", true);
    if (ref.trim().length < 4) return A.say("Introduza o ID da transação recebido por SMS.", true);
    setBusy(true);
    const ok = await run(() => supabase.rpc("request_deposit", { p_channel: ch.name, p_amount: a, p_ref: ref.trim() }), "Depósito enviado. Aguarde a confirmação.");
    setBusy(false);
    if (ok) setPage(null);
  };
  return (
    <>
      <button className="btn dark sm" style={{ alignSelf: "flex-start" }} onClick={() => setPage(null)}>← Voltar</button>
      <div className="card">
        <h3 style={{ margin: "0 0 14px", fontSize: 20 }}>🏦 Selecionar canal de pagamento</h3>
        {chans.map((c) => (
          <div key={c.id} className={"pay" + (sel === c.id ? " on" : "")} onClick={() => setSel(c.id)}>
            <div style={{ fontSize: 40 }}>📱</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{c.name}</div>
            <div className="muted" style={{ lineHeight: 1.7, marginTop: 6 }}>{c.holder}<br />{c.number}</div>
          </div>
        ))}
        {chans.length === 0 && <div className="muted">Sem canais ativos. Contacte o suporte.</div>}
        {ch && (
          <>
            <div className="warn info">
              1) Envie o valor para {ch.number} ({ch.holder}). 2) Escreva abaixo o valor e o ID da transação. 3) O saldo é creditado depois de o pagamento ser confirmado.
            </div>
            <Field label="Valor enviado (MZN)">
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="500" />
            </Field>
            <Field label="ID da transação">
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ex.: CK12AB3XYZ" />
            </Field>
            <div style={{ height: 16 }} />
            <button className="btn" disabled={busy} onClick={send}>{busy ? "Aguarde…" : "Enviar depósito"}</button>
          </>
        )}
      </div>
    </>
  );
}

/* ───────── Levantamento ───────── */
export function Withdraw({ A }) {
  const { data, me, run, setPage } = A;
  const chans = data.chans;
  const [ch, setCh] = useState(chans[0] ? chans[0].name : "");
  const [num, setNum] = useState(me.phone.slice(3));
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const a = Number(amount);
    const n = num.replace(/\s/g, "");
    if (!ch) return A.say("Escolha um canal.", true);
    if (!(a >= 100)) return A.say("O levantamento mínimo é 100 MZN.", true);
    if (a > me.balance) return A.say("Saldo insuficiente.", true);
    if (!/^\d{9}$/.test(n)) return A.say("Número de recebimento inválido.", true);
    setBusy(true);
    const ok = await run(() => supabase.rpc("request_withdrawal", { p_channel: ch, p_number: n, p_amount: a }), "Pedido enviado. Será pago após aprovação.");
    setBusy(false);
    if (ok) setPage(null);
  };
  return (
    <>
      <button className="btn dark sm" style={{ alignSelf: "flex-start" }} onClick={() => setPage(null)}>← Voltar</button>
      <div className="card">
        <div className="muted">Disponível para levantar</div>
        <div className="big" style={{ fontSize: 34 }}>{fmt(me.balance)} MZN</div>
        <Field label="Canal">
          <select value={ch} onChange={(e) => setCh(e.target.value)}>
            {chans.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Número que vai receber">
          <input inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value)} />
        </Field>
        <Field label="Valor (MZN)">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="100" />
        </Field>
        <div style={{ height: 16 }} />
        <button className="btn purple" disabled={busy} onClick={send}>{busy ? "Aguarde…" : "Pedir levantamento"}</button>
        <div className="muted" style={{ marginTop: 12, lineHeight: 1.5 }}>
          Só o saldo livre pode ser levantado. O capital investido fica disponível depois do resgate no fim do prazo.
        </div>
      </div>
    </>
  );
}

/* ───────── Perfil ───────── */
export function Profile({ A }) {
  const { data, me, now, say, setPage, setAdminOpen } = A;
  const mine = data.invs;
  const invested = mine.filter((i) => !i.redeemed).reduce((s, i) => s + Number(i.amount), 0);
  const earned = mine.reduce((s, i) => s + (i.redeemed ? Number(i.payout) - Number(i.amount) : calc(i, now).interest), 0);
  const [old, setOld] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState("tx");

  const changePin = async () => {
    if (!/^\d{4}$/.test(old)) return say("Introduza o PIN atual.", true);
    if (!/^\d{4}$/.test(n1)) return say("O novo PIN tem de ter 4 números.", true);
    if (n1 !== n2) return say("Os PINs não coincidem.", true);
    const check = await supabase.auth.signInWithPassword({ email: emailOf(me.phone), password: pwOf(old) });
    if (check.error) return say("PIN atual incorreto.", true);
    const { error } = await supabase.auth.updateUser({ password: pwOf(n1) });
    if (error) return say(error.message, true);
    setOld(""); setN1(""); setN2(""); setOpen(false);
    say("PIN alterado.");
  };

  const empty = (hist === "tx" && !data.txs.length) || (hist === "dep" && !data.deps.length) || (hist === "wd" && !data.wds.length);

  return (
    <>
      <div className="card hero">
        <div className="muted">💰 SALDO</div>
        <div className="big">{fmt(me.balance)} MZN</div>
        <div className="row"><span className="muted">Total investido</span><b>{fmt(invested)} MZN</b></div>
        <div className="row"><span className="muted">Rendimento acumulado</span><b>{fmt(earned, 4)} MZN</b></div>
        <div className="row"><span className="muted">Amigos convidados</span><b>{data.refs.length}</b></div>
      </div>
      <div className="card">
        <h3 style={{ margin: "0 0 4px", fontSize: 20 }}>👤 Informações pessoais</h3>
        <div className="row"><span className="muted">Conta</span><b>{me.phone}</b></div>
        <div className="row"><span className="muted">Código de convite</span><b>{me.invite_code}</b></div>
      </div>
      <button className="btn" onClick={() => setPage("deposit")}>💰 Depósito</button>
      <button className="btn purple" onClick={() => setPage("withdraw")}>💸 Levantamento</button>
      {me.is_admin && <button className="btn ghost" onClick={() => setAdminOpen(true)}>🛠️ Painel de administração</button>}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpen(!open)}>
          <h3 style={{ margin: 0, fontSize: 20 }}>🔐 Alterar PIN</h3><span>{open ? "▲" : "▼"}</span>
        </div>
        {open && (
          <>
            <Field label="PIN atual"><input type="password" inputMode="numeric" maxLength={4} value={old} onChange={pinInput(setOld)} /></Field>
            <Field label="Novo PIN"><input type="password" inputMode="numeric" maxLength={4} value={n1} onChange={pinInput(setN1)} /></Field>
            <Field label="Confirmar novo PIN"><input type="password" inputMode="numeric" maxLength={4} value={n2} onChange={pinInput(setN2)} /></Field>
            <div style={{ height: 14 }} />
            <button className="btn" onClick={changePin}>✅ Confirmar</button>
          </>
        )}
      </div>
      <div className="card">
        <h3 style={{ margin: "0 0 12px", fontSize: 20 }}>📋 Registos de fundos</h3>
        <div className="tabs">
          <button className={hist === "tx" ? "on" : ""} onClick={() => setHist("tx")}>Transações</button>
          <button className={hist === "dep" ? "on" : ""} onClick={() => setHist("dep")}>Depósitos</button>
          <button className={hist === "wd" ? "on" : ""} onClick={() => setHist("wd")}>Levantamentos</button>
        </div>
        {hist === "tx" && data.txs.map((t) => (
          <div className="row" key={t.id}>
            <div><div>{t.type}</div><div className="muted">{dt(t.created_at)}</div></div>
            <b style={{ color: t.amount >= 0 ? "#00c853" : "#ff8a80" }}>{t.amount >= 0 ? "+" : ""}{fmt(t.amount)} MZN</b>
          </div>
        ))}
        {hist === "dep" && data.deps.map((t) => (
          <div className="row" key={t.id}>
            <div><div>{t.channel} · {fmt(t.amount)} MZN</div><div className="muted">{dt(t.created_at)}</div></div><Tag s={t.status} />
          </div>
        ))}
        {hist === "wd" && data.wds.map((t) => (
          <div className="row" key={t.id}>
            <div><div>{t.channel} · {fmt(t.amount)} MZN</div><div className="muted">{dt(t.created_at)}</div></div><Tag s={t.status} />
          </div>
        ))}
        {empty && <div className="muted" style={{ padding: "16px 0" }}>Sem registos.</div>}
      </div>
      <button className="btn red" onClick={() => supabase.auth.signOut()}>🚪 Sair</button>
    </>
  );
}
