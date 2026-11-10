import { useState } from "react";
import { useStore, START_BALANCE, type Theme } from "../store";
import { Control, Odds } from "./Control";

const themes: { id: Theme; name: string; desc: string }[] = [
  { id: "noir", name: "X7 Noir", desc: "Fast Schwarz mit Burgund und Pink." },
  { id: "rose", name: "X7 Rosé", desc: "Hell, Creme-Rosé und Burgund." },
  { id: "royale", name: "Royale", desc: "Filzgrün und Gold wie am Tisch." },
];
const currencies = ["◆", "$", "€", "Credits"];

export function Settings({ replayIntro }: { replayIntro: () => void }) {
  const { s, player, fmt, setSettings, setBalance, refill, canRefill, resetStats, clearHistory, locked } = useStore();
  const [bal, setBal] = useState(String(Math.round(player.balance)));
  const [confirm, setConfirm] = useState<null | "stats" | "history">(null);

  return (
    <div className="screen settings">
      <h1 className="screen__title">Einstellungen</h1>

      <h2 className="sec">Guthaben · {player.name}</h2>
      <div className="card">
        {locked ? (
          <p className="muted">Während eines Turniers (auf einem Handy oder online) ist das Guthaben fest. Bearbeiten und Auffüllen sind gesperrt.</p>
        ) : (
          <>
            <div className="row">
              <span><b>Aktuell</b><small>Spielgeld ohne echten Wert</small></span>
              <b>{fmt(player.balance)}</b>
            </div>
            <form className="row" onSubmit={(e) => { e.preventDefault(); setBalance(Number(bal)); }}>
              <label htmlFor="bal-edit"><b>Guthaben festlegen</b><small>Beliebiger Betrag, sofort aktiv</small></label>
              <div className="inline">
                <input id="bal-edit" type="number" inputMode="decimal" min={0} value={bal} onChange={(e) => setBal(e.target.value)} />
                <button className="pill">Setzen</button>
              </div>
            </form>
            <div className="quick">
              {[1000, 10000, 100000, 1000000].map((n) => <button key={n} className="pill" onClick={() => { setBalance(n); setBal(String(n)); }}>{n.toLocaleString("de-DE")}</button>)}
            </div>
            <button className="action action--ghost" onClick={refill} disabled={!canRefill}>+{START_BALANCE} gratis auffüllen</button>
          </>
        )}
      </div>

      <h2 className="sec">Spielquoten</h2>
      <Odds />

      <h2 className="sec">Ergebnisse steuern</h2>
      <Control />

      <h2 className="sec">Darstellung</h2>
      <div className="card">
        <div className="themes">
          {themes.map((t) => (
            <button key={t.id} className={`theme theme--${t.id} ${s.settings.theme === t.id ? "is-on" : ""}`} onClick={() => setSettings({ theme: t.id })}>
              <span className="theme__swatch" /><b>{t.name}</b><small>{t.desc}</small>
            </button>
          ))}
        </div>
        <div className="row">
          <span><b>Währungszeichen</b></span>
          <div className="seg seg--sm">{currencies.map((c) => <button key={c} className={s.settings.currency === c ? "is-on" : ""} onClick={() => setSettings({ currency: c })}>{c}</button>)}</div>
        </div>
      </div>

      <h2 className="sec">Allgemein</h2>
      <div className="card">
        <div className="row">
          <span><b>Sounds</b><small>Klicks, Karten, Gewinne und Effekte</small></span>
          <button role="switch" aria-checked={s.settings.sound} className={`switch ${s.settings.sound ? "is-on" : ""}`} onClick={() => setSettings({ sound: !s.settings.sound })} />
        </div>
        {s.settings.sound && (
          <div className="row">
            <label htmlFor="vol"><b>Lautstärke</b></label>
            <input id="vol" className="range range--sm" data-lenis-prevent type="range" min={0} max={1} step={0.05} value={s.settings.volume} onChange={(e) => setSettings({ volume: Number(e.target.value) })} />
          </div>
        )}
        <div className="row">
          <span><b>Haptik</b><small>Vibration bei Aktionen (iPhone)</small></span>
          <button role="switch" aria-checked={s.settings.haptics} className={`switch ${s.settings.haptics ? "is-on" : ""}`} onClick={() => setSettings({ haptics: !s.settings.haptics })} />
        </div>
        <div className="row">
          <span><b>Smooth Scrolling</b><small>Besonders weiches Scrollen in der ganzen App</small></span>
          <button role="switch" aria-checked={s.settings.smooth} className={`switch ${s.settings.smooth ? "is-on" : ""}`} onClick={() => setSettings({ smooth: !s.settings.smooth })} />
        </div>
        <div className="row">
          <span><b>Trainingsmodus</b><small>Tipps bei Blackjack, Poker und Dragon Tiger</small></span>
          <button role="switch" aria-checked={s.settings.training} className={`switch ${s.settings.training ? "is-on" : ""}`} onClick={() => setSettings({ training: !s.settings.training })} />
        </div>
        <button className="row row--btn" onClick={replayIntro}><b>Einführung erneut ansehen</b></button>
        {confirm === null ? (
          <>
            <button className="row row--btn row--danger" onClick={() => setConfirm("stats")}><b>Statistik zurücksetzen</b></button>
            <button className="row row--btn row--danger" onClick={() => setConfirm("history")}><b>Verlauf löschen</b></button>
          </>
        ) : (
          <div className="confirm">
            <span>Wirklich {confirm === "stats" ? "die Statistik zurücksetzen" : "den Verlauf löschen"}?</span>
            <button className="pill" onClick={() => setConfirm(null)}>Abbrechen</button>
            <button className="pill pill--danger" onClick={() => { if (confirm === "stats") resetStats(); else clearHistory(); setConfirm(null); }}>Ja</button>
          </div>
        )}
      </div>

      <h2 className="sec">Über</h2>
      <div className="card about">
        <b>X7 Casino ist ein Simulator.</b>
        <p>In dieser App gibt es kein echtes Geld. Credits sind kostenlos, können nicht gekauft, gewonnen, ausgezahlt oder übertragen werden und sind außerhalb der App nichts wert. Es gibt keine Käufe und keine Pro-Version. Alles wird auf deinem Gerät erzeugt und bleibt dort.</p>
        <p>Ein Erfolg hier bedeutet nichts für echtes Glücksspiel. Wenn dir Glücksspiel Probleme macht: BZgA-Beratung 0800 1 37 27 00 (kostenlos, anonym).</p>
        <p className="muted">X7 Casino · ein Projekt von X7 Ventures · xr7uz.xyz</p>
      </div>
    </div>
  );
}
