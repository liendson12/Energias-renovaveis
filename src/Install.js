import { useState, useEffect } from "react";
import { Icon } from "./Icon.jsx";

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

// Barra com seta ⬇ para instalar o app no telemóvel
export default function InstallBar({ low }) {
  const [evt, setEvt] = useState(null);
  const [done, setDone] = useState(standalone());
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => { setDone(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (done) return null;

  const click = async () => {
    if (evt) {
      evt.prompt();
      await evt.userChoice.catch(() => {});
      setEvt(null);
    } else setHelp(true);
  };

  return (
    <>
      <button className={"install" + (low ? " low" : "")} onClick={click}>
        <span className="arr"><Icon n="download" s={20} /></span>
        <span>Baixar / instalar o app</span>
      </button>
      {help && (
        <div className="modal" onClick={() => setHelp(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", fontSize: 21 }}>Instalar o app</h3>
            {ios() ? (
              <ol className="muted" style={{ lineHeight: 1.9, fontSize: 16, paddingLeft: 20 }}>
                <li>Abra este site no <b>Safari</b>.</li>
                <li>Toque no botão de partilhar (quadrado com seta ↑).</li>
                <li>Escolha <b>Adicionar ao ecrã principal</b>.</li>
              </ol>
            ) : (
              <ol className="muted" style={{ lineHeight: 1.9, fontSize: 16, paddingLeft: 20 }}>
                <li>Abra o menu do navegador (⋮).</li>
                <li>Escolha <b>Instalar app</b> ou <b>Adicionar ao ecrã principal</b>.</li>
              </ol>
            )}
            <button className="btn" onClick={() => setHelp(false)}>Entendi</button>
          </div>
        </div>
      )}
    </>
  );
}
