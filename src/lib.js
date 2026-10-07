export const MIN = 60000;
export const YEAR_MIN = 365 * 1440;
export const MAX_RATE = 25; // tem de coincidir com o limite na base de dados

export const fmt = (n, d = 2) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const normPhone = (s) => {
  let d = (s || "").replace(/\D/g, "");
  if (d.length === 9) d = "258" + d;
  return d;
};
export const validPhone = (d) => /^258(8[2-7])\d{7}$/.test(d);
export const mask = (p) => p.slice(0, 5) + "****" + p.slice(-3);
export const dt = (ts) =>
  new Date(ts).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Login por número + PIN usando o Supabase Auth com um e-mail "falso" derivado do número
export const emailOf = (phone) => `${phone}@energiamz.app`;
export const pwOf = (pin) => `${pin}${import.meta.env.VITE_PIN_SUFFIX || "-pin"}`;

export const CATS = {
  Solar: { emoji: "☀️", g: "linear-gradient(135deg,#f59e0b,#92400e)" },
  "Eólica": { emoji: "🌬️", g: "linear-gradient(135deg,#0d9488,#1e3a8a)" },
  "Hídrica": { emoji: "💧", g: "linear-gradient(135deg,#2563eb,#3730a3)" },
  Biomassa: { emoji: "🌿", g: "linear-gradient(135deg,#16a34a,#14532d)" },
};

export const ST = {
  pending: "pendente", approved: "aprovado", rejected: "rejeitado", paid: "pago",
  draft: "rascunho", published: "publicado", closed: "encerrado",
};

// Rendimento acumulado minuto a minuto (taxa anual ÷ minutos do ano).
// O valor pago no resgate é calculado no servidor (função redeem).
export const calc = (inv, now) => {
  const start = new Date(inv.start_at).getTime();
  const total = inv.term_days * 1440;
  const m = Math.max(0, Math.min(Math.floor((now - start) / MIN), total));
  const interest = (inv.amount * (inv.rate / 100) * m) / YEAR_MIN;
  const final = (inv.amount * (inv.rate / 100) * total) / YEAR_MIN;
  return { m, total, interest, final, matured: m >= total };
};
