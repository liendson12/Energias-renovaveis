import { ST } from "./lib";

export const Field = ({ label, children }) => (
  <div>
    <label className="f">{label}</label>
    {children}
  </div>
);

export const Tag = ({ s }) => (
  <span className={"tag " + (s === "pending" ? "pend" : s === "rejected" ? "no" : "ok")}>{ST[s] || s}</span>
);
