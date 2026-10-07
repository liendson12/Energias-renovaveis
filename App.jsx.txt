import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { fmt } from "./lib";
import { Auth, Home, Wallet, Invite, News, Deposit, Withdraw, Profile, InvestModal } from "./screens.jsx";
import Admin from "./Admin.jsx";

const TITLES = {
  home: "🌬️ Energia Renovável",
  wallet: "📈 Os Meus Títulos",
  invite: "👥 Convites",
  news: "⚡ Novidades",
  profile: "🔋 Perfil",
};

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = a carregar
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("home");
  const [page, setPage] = useState(null); // 'deposit' | 'withdraw'
  const [adminOpen, setAdminOpen] = useState(false);
  const [invest, setInvest] = useState(null);
  const [toast, setToast] = useState(null);
  const [, setTick] = useState(0);
  const toastTimer = useRef(null);

  const say = useCallback((msg, err) => {
    setToast({ msg, err });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // Sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) { setData(null); setTab("home"); setPage(null); setAdminOpen(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Carregar dados do utilizador
  const refresh = useCallback(async () => {
    if (!session) return;
    const uid = session.user.id;
    const [me, projects, invs, deps, wds, txs, chans, notices, settings, refs] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase.from("projects").select("*").in("status", ["published", "closed"]).order("created_at", { ascending: false }),
      supabase.from("investments").select("*").eq("user_id", uid).order("start_at", { ascending: false }),
      supabase.from("deposits").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
      supabase.from("payment_channels").select("*").eq("active", true).order("created_at"),
      supabase.from("notices").select("*").order("created_at", { ascending: false }),
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.rpc("my_referrals"),
    ]);
    const failed = [me, projects, invs, deps, wds, txs, chans, notices, settings].find((r) => r.error);
    if (failed) { say("Não foi possível carregar os dados: " + failed.error.message, true); return; }
    setData({
      me: me.data, projects: projects.data, invs: invs.data, deps: deps.data, wds: wds.data,
      txs: txs.data, chans: chans.data, notices: notices.data, settings: settings.data, refs: refs.data || [],
    });
  }, [session, say]);

  useEffect(() => { refresh(); }, [refresh]);

  // Atualiza o rendimento a cada 5 s e os dados a cada 60 s
  useEffect(() => {
    const a = setInterval(() => setTick((t) => t + 1), 5000);
    const b = setInterval(() => refresh(), 60000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [refresh]);

  // Executa uma ação no servidor, mostra mensagem e recarrega
  const run = useCallback(async (fn, okMsg) => {
    try {
      const r = await fn();
      if (r && r.error) throw r.error;
      if (okMsg) say(okMsg);
      await refresh();
      return true;
    } catch (e) {
      say(e.message || "Ocorreu um erro.", true);
      return false;
    }
  }, [refresh, say]);

  if (session === undefined) return <div className="app" />;

  if (!session)
    return (
      <div className="app">
        {toast && <div className={"toast" + (toast.err ? " err" : "")}>{toast.msg}</div>}
        <Auth A={{ say }} />
      </div>
    );

  if (!data) return <div className="app"><div className="wrap muted" style={{ textAlign: "center", paddingTop: 80 }}>A carregar…</div></div>;

  const A = { data, me: data.me, now: Date.now(), say, run, refresh, setPage, setTab, setInvest, setAdminOpen };
  const title = page === "deposit" ? "💰 Depósito" : page === "withdraw" ? "💸 Levantamento" : TITLES[tab];

  return (
    <div className="app">
      {toast && <div className={"toast" + (toast.err ? " err" : "")}>{toast.msg}</div>}
      <div className="top">
        <h1>{title}</h1>
        <div className="bal">Saldo: <b>{fmt(data.me.balance)} MZN</b></div>
      </div>
      <div className="wrap">
        {page === "deposit" ? <Deposit A={A} /> : page === "withdraw" ? <Withdraw A={A} /> : (
          <>
            {tab === "home" && <Home A={A} />}
            {tab === "wallet" && <Wallet A={A} />}
            {tab === "invite" && <Invite A={A} />}
            {tab === "news" && <News A={A} />}
            {tab === "profile" && <Profile A={A} />}
          </>
        )}
      </div>
      {data.settings.whatsapp && (
        <a className="wa" href={"https://wa.me/" + data.settings.whatsapp} target="_blank" rel="noreferrer">💬</a>
      )}
      <div className="nav">
        {[["home", "🌬️", "Início"], ["wallet", "📈", "Títulos"], ["invite", "🌀", "Convites"], ["news", "⚡", "Novidades"], ["profile", "🔋", "Perfil"]].map(([k, e, l]) => (
          <button key={k} className={tab === k && !page ? "on" : ""} onClick={() => { setTab(k); setPage(null); }}>
            <span>{e}</span>{l}
          </button>
        ))}
      </div>
      {invest && <InvestModal A={A} proj={invest} />}
      {adminOpen && data.me.is_admin && <Admin A={A} />}
    </div>
  );
}
