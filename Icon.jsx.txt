// Ícones de linha (traço) — substituem os emojis para um visual mais profissional
const P = {
  home: <path d="m3 10.5 9-7.5 9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></>,
  users: <><circle cx="9" cy="7" r="4" /><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" /><path d="M17 3.5a4 4 0 0 1 0 7.5" /><path d="M22 21v-1a6 6 0 0 0-4-5.6" /></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  deposit: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  withdraw: <><path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M5 3h14" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /></>,
  wind: <><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></>,
  droplet: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />,
  leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z" /><path d="M2 21c0-3 1.9-5.4 5.1-6.1C9.5 14.4 12 13 13 12" /></>,
  bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  back: <path d="m15 18-6-6 6-6" />,
  down: <path d="m6 9 6 6 6-6" />,
  up: <path d="m18 15-6-6-6 6" />,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M12 18h.01" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
  bank: <><path d="M3 22h18" /><path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7" /><path d="M12 2 3 7h18z" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
};

export function Icon({ n, s = 22 }) {
  return (
    <svg className="ico" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[n]}
    </svg>
  );
}

export const Logo = ({ big }) => (
  <span className={"logo" + (big ? " lg" : "")}><Icon n="bolt" s={big ? 34 : 18} /></span>
);
