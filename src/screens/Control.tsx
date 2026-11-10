import { useState } from "react";
import { LuLock, LuMinus, LuPlus, LuTrash2 } from "react-icons/lu";
import { useStore } from "../store";
import { games, tunable } from "../games/registry";

const presets = [
  { v: 0, name: "Fair", desc: "0 % Vorteil – auf lange Sicht ein Nullsummenspiel." },
  { v: 1, name: "Echtes Casino", desc: "1 % Vorteil – etwa wie ein Online-Casino." },
  { v: 3, name: "Standard", desc: "3 % Vorteil – Voreinstellung der App." },
  { v: 5, name: "Vegas-Casino", desc: "5 % Vorteil – etwa wie ein Casino in Las Vegas." },
  { v: 10, name: "Grausam", desc: "10 % Vorteil – eher Spielautomat oder Lotterie." },
  { v: -3, name: "Spielervorteil", desc: "−3 % – du bist im Vorteil, was es in echt kaum gibt." },
];
const scripts: { name: string; desc: string; seq: ("W" | "L")[] }[] = [
  { name: "Das Comeback", desc: "Vier Niederlagen, dann die Runde, die alles holt.", seq: ["L", "L", "L", "L", "W"] },
  { name: "Die Glückssträhne", desc: "Sechs Siege am Stück, dann drei, die alles zurückholen.", seq: ["W", "W", "W", "W", "W", "W", "L", "L", "L"] },
  { name: "Das langsame Ausbluten", desc: "Ein Sieg, eine Pechsträhne, ein Sieg, eine längere Strähne.", seq: ["W", "L", "L", "L", "W", "L", "L", "L", "L", "L"] },
  { name: "Achterbahn", desc: "Immer abwechselnd Gewinn und Verlust.", seq: ["W", "L", "W", "L", "W", "L"] },
];

/** Spielquoten bearbeiten */
export function Odds() {
  const { s, setSettings, locked } = useStore();
  const [open, setOpen] = useState(false);
  const byGame = s.settings.edgeByGame ?? {};
  const setGame = (id: string, v: number | null) => {
    const next = { ...byGame };
    if (v === null) delete next[id]; else next[id] = v;
    setSettings({ edgeByGame: next });
  };
  return (
    <div className="card">
      {locked && <p className="locknote"><LuLock /> Im Turnier gelten feste, faire Quoten für alle.</p>}
      <div className="presets">
        {presets.map((p) => (
          <button key={p.v} className={`preset ${s.settings.edge === p.v ? "is-on" : ""}`} onClick={() => setSettings({ edge: p.v })}>
            <span className="preset__radio" aria-hidden="true" />
            <span><b>{p.name}</b><small>{p.desc}</small></span>
          </button>
        ))}
      </div>
      <div className="row">
        <label htmlFor="edge"><b>Eigener Wert</b><small>Hausvorteil von −5 % bis 10 %</small></label>
        <b className={s.settings.edge < 0 ? "pos" : ""}>{s.settings.edge.toFixed(1)} %</b>
      </div>
      <input id="edge" className="range" data-lenis-prevent type="range" min={-5} max={10} step={0.5} value={s.settings.edge} onChange={(e) => setSettings({ edge: Number(e.target.value) })} />
      <button className="row row--btn" onClick={() => setOpen((v) => !v)}><b>Quoten pro Spiel {open ? "ausblenden" : "einstellen"}</b><small>{Object.keys(byGame).length} angepasst</small></button>
      {open && (
        <ul className="pergame">
          {games.filter((g) => tunable.includes(g.id)).map((g) => {
            const v = byGame[g.id];
            return (
              <li key={g.id}>
                <span>{g.name}</span>
                {v === undefined ? (
                  <button className="pill" onClick={() => setGame(g.id, s.settings.edge)}>Standard ({s.settings.edge} %)</button>
                ) : (
                  <span className="stepper">
                    <button className="iconbtn iconbtn--sm" onClick={() => setGame(g.id, Math.max(-5, v - 0.5))} aria-label="weniger"><LuMinus /></button>
                    <b>{v.toFixed(1)} %</b>
                    <button className="iconbtn iconbtn--sm" onClick={() => setGame(g.id, Math.min(10, v + 0.5))} aria-label="mehr"><LuPlus /></button>
                    <button className="iconbtn iconbtn--sm" onClick={() => setGame(g.id, null)} aria-label="zurücksetzen"><LuTrash2 /></button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted">Kartenspiele und Roulette folgen festen Regeln und haben eigene Quoten.</p>
    </div>
  );
}

/** Ergebnisse steuern: Modus und Sequenz */
export function Control() {
  const { s, setSettings, locked } = useStore();
  const c = s.settings.control;
  const set = (p: Partial<typeof c>) => setSettings({ control: { ...c, ...p } });
  const modes = [
    { id: "off", name: "Normal", desc: "Echter Zufall nach den eingestellten Quoten." },
    { id: "win", name: "Alles gewinnen", desc: "Jedes Spiel gewinnt jede Runde." },
    { id: "loss", name: "Alles verlieren", desc: "Jedes Spiel verliert jede Runde." },
  ] as const;
  const rest = c.script.slice(c.pos);
  return (
    <div className="card">
      {locked && <p className="locknote"><LuLock /> Im Turnier ist die Steuerung aus – alle spielen mit echtem Zufall.</p>}
      <div className="presets">
        {modes.map((m) => (
          <button key={m.id} className={`preset ${c.mode === m.id ? "is-on" : ""}`} onClick={() => set({ mode: m.id })}>
            <span className="preset__radio" aria-hidden="true" />
            <span><b>{m.name}</b><small>{m.desc}</small></span>
          </button>
        ))}
      </div>
      <div className="row"><span><b>Sequenz</b><small>Die nächsten Runden folgen dieser Liste statt dem Zufall. Hat Vorrang vor dem Modus.</small></span></div>
      <div className="seq">
        {c.script.length === 0 ? <span className="muted">Nichts geplant. Füge Gewinne oder Verluste hinzu.</span> :
          c.script.map((x, i) => <span key={i} className={`seq__item seq__item--${x} ${i < c.pos && !c.repeat ? "is-done" : ""} ${c.repeat && i === c.pos ? "is-next" : ""}`}>{x === "W" ? "G" : "V"}</span>)}
      </div>
      <div className="actions2">
        <button className="action action--ghost seq__add seq__add--w" onClick={() => set({ script: [...c.script.slice(c.repeat ? 0 : c.pos), "W"], pos: c.repeat ? c.pos : 0 })}><LuPlus /> Gewinnen</button>
        <button className="action action--ghost seq__add seq__add--l" onClick={() => set({ script: [...c.script.slice(c.repeat ? 0 : c.pos), "L"], pos: c.repeat ? c.pos : 0 })}><LuPlus /> Verlieren</button>
      </div>
      <div className="presets">
        {scripts.map((p) => (
          <button key={p.name} className="preset" onClick={() => set({ script: p.seq, pos: 0 })}>
            <span className="preset__n">{p.seq.length}</span>
            <span><b>{p.name}</b><small>{p.desc}</small></span>
          </button>
        ))}
      </div>
      <div className="row">
        <span><b>Wiederholen</b><small>Am Ende wieder von vorn beginnen</small></span>
        <button role="switch" aria-checked={c.repeat} className={`switch ${c.repeat ? "is-on" : ""}`} onClick={() => set({ repeat: !c.repeat, pos: 0 })} />
      </div>
      {(c.script.length > 0) && <button className="action action--ghost" onClick={() => set({ script: [], pos: 0 })}><LuTrash2 /> Sequenz löschen{rest.length && !c.repeat ? ` (${rest.length} offen)` : ""}</button>}
      <p className="muted">Ein Spiel zeigt oben immer an, wenn eine Vorgabe aktiv ist.</p>
    </div>
  );
}
