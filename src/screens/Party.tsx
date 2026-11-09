import { useState } from "react";
import { Online } from "./Online";
import { LuCrown, LuPlus, LuTrash2, LuTrophy, LuUsers } from "react-icons/lu";
import { useStore } from "../store";

export function Party() {
  const { s, fmt, addPlayer, removePlayer, renamePlayer, setActive, setParty, startTournament, endTournament, player } = useStore();
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState(10);
  const [start, setStart] = useState(1000);
  const t = s.party.tournament;
  const ranked = [...s.players].sort((a, b) => b.balance - a.balance);
  const [mode, setMode] = useState<"local" | "online">(s.online ? "online" : "local");

  return (
    <div className="screen party">
      <section className="hero hero--sm">
        <p className="hero__kick"><LuUsers /> Party-Modus</p>
        <h1 className="hero__title">Gegen Freunde.<br /><span>{mode === "local" ? "Ein Handy." : "Jeder sein Handy."}</span></h1>
        <p className="hero__lead">Gleiches Startgeld, gleiche Rundenzahl. Wer am Ende am meisten hat, gewinnt – wer am meisten verliert, hat verloren.</p>
      </section>
      <div className="seg">
        <button className={mode === "local" ? "is-on" : ""} onClick={() => setMode("local")}>Auf einem Handy</button>
        <button className={mode === "online" ? "is-on" : ""} onClick={() => setMode("online")}>Jeder am eigenen</button>
      </div>
      {mode === "online" ? <Online /> : <>

      <h2 className="sec">Spieler</h2>
      <ul className="players">
        {s.players.map((p) => (
          <li key={p.id} className={p.id === player.id ? "is-active" : ""}>
            <span className="dot" style={{ background: p.color }} />
            <input aria-label="Name" value={p.name} onChange={(e) => renamePlayer(p.id, e.target.value)} />
            <span className="players__bal">{fmt(p.balance)}</span>
            {p.id !== player.id && <button className="pill" onClick={() => setActive(p.id)}>Am Zug</button>}
            {s.players.length > 1 && !t.active && <button className="iconbtn iconbtn--sm" onClick={() => removePlayer(p.id)} aria-label={`${p.name} entfernen`}><LuTrash2 /></button>}
          </li>
        ))}
      </ul>
      {s.players.length < 6 && !t.active && (
        <form className="addp" onSubmit={(e) => { e.preventDefault(); addPlayer(name); setName(""); }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name eingeben" aria-label="Neuer Spieler" />
          <button className="action action--primary"><LuPlus /> Hinzufügen</button>
        </form>
      )}

      <div className="card">
        <div className="row">
          <span><b>Abwechseln</b><small>Nach wie vielen Runden der nächste Spieler dran ist</small></span>
          <div className="seg seg--sm">
            {[1, 3, 5].map((n) => <button key={n} className={s.party.roundsPerTurn === n ? "is-on" : ""} onClick={() => setParty({ roundsPerTurn: n })}>{n}</button>)}
          </div>
        </div>
        <div className="row">
          <span><b>Party-Modus aktiv</b><small>Zeigt nach jedem Zug „Weitergeben“</small></span>
          <button role="switch" aria-checked={s.party.enabled} className={`switch ${s.party.enabled ? "is-on" : ""}`} onClick={() => setParty({ enabled: !s.party.enabled })} disabled={s.players.length < 2} />
        </div>
      </div>

      <h2 className="sec"><LuTrophy /> Turnier</h2>
      {!t.active ? (
        <div className="card">
          <p className="muted">Alle starten mit festem Geld, Auffüllen und Bearbeiten sind gesperrt. Jeder spielt gleich viele Runden in beliebigen Spielen.</p>
          <div className="row">
            <span><b>Runden pro Spieler</b></span>
            <div className="seg seg--sm">{[5, 10, 20, 30].map((n) => <button key={n} className={rounds === n ? "is-on" : ""} onClick={() => setRounds(n)}>{n}</button>)}</div>
          </div>
          <div className="row">
            <span><b>Startgeld</b></span>
            <div className="seg seg--sm">{[500, 1000, 5000].map((n) => <button key={n} className={start === n ? "is-on" : ""} onClick={() => setStart(n)}>{n}</button>)}</div>
          </div>
          <button className="action action--primary" disabled={s.players.length < 2} onClick={() => startTournament(rounds, start)}>
            {s.players.length < 2 ? "Mindestens 2 Spieler hinzufügen" : "Turnier starten"}
          </button>
        </div>
      ) : (
        <div className="card">
          <ol className="board">
            {ranked.map((p, i) => {
              const net = p.balance - t.startBalance;
              return (
                <li key={p.id}>
                  <span className="board__pos">{i === 0 ? <LuCrown /> : i + 1}</span>
                  <span className="dot" style={{ background: p.color }} />
                  <b>{p.name}</b>
                  <small>{p.tourRounds}/{t.roundsEach}</small>
                  <span className={net >= 0 ? "pos" : "neg"}>{net >= 0 ? "+" : ""}{fmt(net)}</span>
                </li>
              );
            })}
          </ol>
          <button className="action action--ghost" onClick={endTournament}>Turnier beenden</button>
        </div>
      )}
      </>}
    </div>
  );
}
