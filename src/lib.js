import { supabase } from "./supabase";

export const MIN = 60000;
export const YEAR_MIN = 365 * 1440;
export const MAX_RATE = 200; // tem de coincidir com o limite na base de dados
export const MIN_TERM = 4; // prazo mínimo (dias); tem de coincidir com a base de dados

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
  Solar: { icon: "sun", g: "linear-gradient(135deg,#f0a202,#b45309)" },
  "Eólica": { icon: "wind", g: "linear-gradient(135deg,#0e7490,#164e63)" },
  "Hídrica": { icon: "droplet", g: "linear-gradient(135deg,#1d6fd1,#1e3a8a)" },
  Biomassa: { icon: "leaf", g: "linear-gradient(135deg,#15803d,#14532d)" },
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

// ---------- Imagens (Supabase Storage, bucket público "media") ----------
const shrink = (file, max = 1280) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao processar a imagem."))), "image/jpeg", 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Ficheiro de imagem inválido.")); };
    img.src = url;
  });

export async function uploadImage(file, folder) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Escolha um ficheiro de imagem.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Imagem demasiado grande (máx. 10 MB).");
  const blob = await shrink(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
