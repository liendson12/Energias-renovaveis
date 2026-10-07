import { useState } from "react";
import { ST, uploadImage } from "./lib";

export const Field = ({ label, children }) => (
  <div>
    <label className="f">{label}</label>
    {children}
  </div>
);

export const Tag = ({ s }) => (
  <span className={"tag " + (s === "pending" ? "pend" : s === "rejected" ? "no" : "ok")}>{ST[s] || s}</span>
);

// Escolher e enviar uma imagem (admin)
export function ImagePicker({ value, onChange, folder, say }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadImage(file, folder)); }
    catch (err) { say(err.message || "Falha no envio da imagem.", true); }
    setBusy(false);
  };
  return (
    <div>
      {value && <img className="pick-img" src={value} alt="" />}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label className="btn dark sm pick-btn">
          {busy ? "A enviar…" : value ? "Trocar imagem" : "Escolher imagem"}
          <input type="file" accept="image/*" hidden onChange={pick} disabled={busy} />
        </label>
        {value && <button type="button" className="btn red sm" onClick={() => onChange("")}>Remover</button>}
      </div>
    </div>
  );
}
