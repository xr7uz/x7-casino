import { useEffect, useState } from "react";
import { LuCopy, LuCrown, LuLogOut, LuShare2, LuWifi } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import { useStore } from "../store";
import { fetchLive, inviteCode, liveEnabled, parseInvite, parseResult, resultCode, shareText, type Result } from "../lib/online";

/** Online-Turnier: jeder spielt auf seinem eigenen Handy. */
export function Online() {
  const { s, fmt, createRoom, joinRoom, leaveRoom, addResult } = useStore();
  const o = s.online;
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState(20);
  const [start, setStart] = useState(1000);
  const [invite, setInvite] = useState("");
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const [live, setLive] = useState<Result[] | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Live-Rangliste alle 4 Sekunden, falls ein Server eingerichtet ist
  useEffect(() => {
    if (!o || !liveEnabled()) return;
    let stop = false;
    const tick = async () => { const r = await fetchLive(o.code); if (!stop && r) setLive(r); };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => { stop = true; window.clearInterval(id); };
  }, [o?.code]);

  const share = async (text: string, label: string) => {
    const r = await shareText(text);
    setMsg(r === "copied" ? `${label} kopiert – füge ihn im Chat ein.` : r === "failed" ? "Teilen nicht möglich. Code bitte abschreiben." : "");
  };
  const wa = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

  if (!o) {
    return (
      <div className="online">
        <div className="card">
          <p className="muted">Jeder spielt auf seinem eigenen Handy – egal wo. Alle bekommen dasselbe Startgeld und dieselbe Rundenzahl. Am Ende tauscht ihr eure Ergebnis-Codes, und die App zeigt, wer gewonnen hat.</p>
          <label className="field">
            <span>Dein Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Jamie" maxLength={16} />
          </label>
        </div>

        <h2 className="sec">Raum erstellen</h2>
        <div className="card">
          <div className="row">
            <span><b>Runden pro Spieler</b></span>
            <div className="seg seg--sm">{[10, 20, 50].map((n) => <button key={n} className={rounds === n ? "is-on" : ""} onClick={() => setRounds(n)}>{n}</button>)}</div>
          </div>
          <div className="row">
            <span><b>Startgeld</b></span>
            <div className="seg seg--sm">{[1000, 5000, 25000].map((n) => <button key={n} className={start === n ? "is-on" : ""} onClick={() => setStart(n)}>{n >= 1000 ? `${n / 1000}k` : n}</button>)}</div>
          </div>
          <button className="action action--primary" onClick={() => createRoom(name, rounds, start)}>Raum erstellen</button>
        </div>

        <h2 className="sec">Raum beitreten</h2>
        <form className="card" onSubmit={(e) => {
          e.preventDefault();
          const r = parseInvite(invite);
          if (!r) { setMsg("Das ist kein gültiger Einladungs-Code (Format X7-ABCDE-20-1000)."); return; }
          setMsg(""); joinRoom(r, name);
        }}>
          <label className="field">
            <span>Einladungs-Code</span>
            <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="X7-ABCDE-20-1000" autoCapitalize="characters" />
          </label>
          <button className="action action--ghost">Beitreten</button>
        </form>
        {msg && <p className="note" role="status">{msg}</p>}
      </div>
    );
  }

  const inv = inviteCode(o);
  const mine: Result = { code: o.code, name: o.name, balance: o.balance, played: o.played, device: s.deviceId };
  const myCode = resultCode(mine);
  const base = live ?? o.results;
  const all = [...base.filter((r) => r.device !== s.deviceId), mine].sort((a, b) => b.balance - a.balance);
  const inviteText = `Spiel mit mir X7 Casino! Turnier: ${o.rounds} Runden, ${o.start} Startgeld. Einladungs-Code: ${inv}`;
  const resultText = `Mein X7-Casino-Ergebnis (${o.name}): ${fmt(o.balance)}. Code: ${myCode}`;

  return (
    <div className="online">
      <div className="card room">
        <div className="room__head">
          <span className="room__badge"><LuWifi /> Raum {o.code}</span>
          <small>{o.rounds} Runden · Start {fmt(o.start)}{liveEnabled() ? " · Live" : ""}</small>
        </div>
        <div className="room__progress"><i style={{ width: `${Math.min(100, (o.played / o.rounds) * 100)}%` }} /></div>
        <div className="row"><span><b>{o.name}</b><small>{o.played}/{o.rounds} Runden gespielt</small></span><b className={o.balance >= o.start ? "pos" : "neg"}>{fmt(o.balance)}</b></div>
        {!o.finished && <p className="muted">Spiel jetzt beliebige Spiele in der Lobby. Jede Runde zählt für das Turnier.</p>}
      </div>

      <h2 className="sec">Freunde einladen</h2>
      <div className="card">
        <code className="code">{inv}</code>
        <div className="actions2">
          <button className="action action--ghost" onClick={() => share(inviteText, "Einladung")}><LuShare2 /> Teilen</button>
          <a className="action action--ghost" href={wa(inviteText)} target="_blank" rel="noreferrer"><FaWhatsapp /> WhatsApp</a>
        </div>
      </div>

      <h2 className="sec"><LuCrown /> Rangliste</h2>
      <div className="card">
        <ol className="board">
          {all.map((r, i) => (
            <li key={r.device}>
              <span className="board__pos">{i === 0 ? <LuCrown /> : i + 1}</span>
              <b>{r.name}{r.device === s.deviceId ? " (du)" : ""}</b>
              <small>{r.played}/{o.rounds}</small>
              <span className={r.balance >= o.start ? "pos" : "neg"}>{r.balance >= o.start ? "+" : ""}{fmt(Math.round((r.balance - o.start) * 100) / 100)}</span>
            </li>
          ))}
        </ol>
        {!liveEnabled() && (
          <>
            <p className="muted">Ohne Live-Server: Jeder schickt am Ende seinen Ergebnis-Code in die Gruppe. Füge die Codes deiner Freunde hier ein.</p>
            <form className="addp" onSubmit={(e) => {
              e.preventDefault();
              const r = parseResult(paste);
              if (!r) { setMsg("Ergebnis-Code ungültig oder unvollständig."); return; }
              const st = addResult(r);
              setMsg(st === "ok" ? `${r.name} hinzugefügt.` : st === "own" ? "Das ist dein eigener Code." : "Dieser Code gehört zu einem anderen Raum.");
              if (st === "ok") setPaste("");
            }}>
              <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="X7R.… einfügen" aria-label="Ergebnis-Code eines Freundes" />
              <button className="action action--primary">Hinzufügen</button>
            </form>
          </>
        )}
      </div>

      <h2 className="sec">Dein Ergebnis</h2>
      <div className="card">
        <p className="muted">{o.finished ? "Fertig! Schick deinen Code an die anderen." : "Du kannst deinen Zwischenstand jederzeit teilen."}</p>
        <code className="code code--sm">{myCode}</code>
        <div className="actions2">
          <button className="action action--primary" onClick={() => share(resultText, "Ergebnis")}><LuShare2 /> Teilen</button>
          <button className="action action--ghost" onClick={() => share(myCode, "Code")}><LuCopy /> Nur Code</button>
        </div>
      </div>

      {msg && <p className="note" role="status">{msg}</p>}
      {confirmLeave ? (
        <div className="confirm card">
          <span>Raum verlassen? Dein Turnier-Stand geht verloren.</span>
          <button className="pill" onClick={() => setConfirmLeave(false)}>Bleiben</button>
          <button className="pill pill--danger" onClick={() => { leaveRoom(); setConfirmLeave(false); }}>Verlassen</button>
        </div>
      ) : (
        <button className="action action--ghost" onClick={() => setConfirmLeave(true)}><LuLogOut /> Raum verlassen</button>
      )}
    </div>
  );
}
