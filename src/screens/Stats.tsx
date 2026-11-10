import { useStore } from "../store";
import { gameById } from "../games/registry";
import { achievements, levelOf } from "../lib/progress";

export function Stats() {
  const { s, player, fmt } = useStore();
  const mine = s.history.filter((h) => h.player === player.id);
  const net = player.returned - player.wagered;
  const lv = levelOf(player);
  // Verlauf des Guthabens über die letzten Runden (rückwärts rekonstruiert)
  const recent = mine.slice(0, 60).reverse();
  let bal = player.balance - recent.reduce((a, h) => a + (h.payout - h.bet), 0);
  const series = [bal, ...recent.map((h) => (bal += h.payout - h.bet))];
  const min = Math.min(...series), max = Math.max(...series);
  const y = (v: number) => 90 - ((v - min) / Math.max(1, max - min)) * 80;
  const path = series.map((v, i) => `${i ? "L" : "M"}${(i / Math.max(1, series.length - 1)) * 300},${y(v)}`).join(" ");
  const byGame = Object.entries(mine.reduce<Record<string, { n: number; net: number }>>((acc, h) => {
    (acc[h.game] ??= { n: 0, net: 0 }); acc[h.game].n++; acc[h.game].net += h.payout - h.bet; return acc;
  }, {})).sort((a, b) => b[1].n - a[1].n);

  return (
    <div className="screen stats">
      <section className="hero hero--sm">
        <p className="hero__kick">Statistik · {player.name}</p>
        <h1 className="hero__title"><span className={net >= 0 ? "pos" : "neg"}>{net >= 0 ? "+" : ""}{fmt(net)}</span></h1>
        <div className="kpis">
          <div><span>Runden</span><b>{player.rounds}</b></div>
          <div><span>RTP</span><b>{player.wagered ? `${((player.returned / player.wagered) * 100).toFixed(1)} %` : "–"}</b></div>
          <div><span>Größter Gewinn</span><b>{fmt(player.biggestWin)}</b></div>
        </div>
      </section>
      <div className="card level">
        <div className="level__head">
          <span className="level__badge">{lv.level}</span>
          <span><b>Level {lv.level} · {lv.rank}</b><small>{lv.xp.toLocaleString("de-DE")} XP · noch {lv.toNext.toLocaleString("de-DE")} bis Level {lv.level + 1}</small></span>
        </div>
        <div className="room__progress"><i style={{ width: `${Math.round(lv.progress * 100)}%` }} /></div>
      </div>

      <div className="card">
        <h2 className="sec sec--in">Erfolge · {achievements.filter((a) => a.done(player)).length}/{achievements.length}</h2>
        <ul className="ach">
          {achievements.map((a) => {
            const ok = a.done(player);
            const Icon = a.icon;
            return <li key={a.id} className={ok ? "is-done" : ""}><span className="ach__icon"><Icon /></span><b>{a.name}</b><small>{a.desc}</small></li>;
          })}
        </ul>
      </div>

      {series.length > 2 && (
        <div className="card">
          <h2 className="sec sec--in">Guthaben, letzte {recent.length} Runden</h2>
          <svg viewBox="0 0 300 100" className="spark" preserveAspectRatio="none" aria-label="Verlauf des Guthabens">
            <path d={`${path} L300,100 L0,100 Z`} className="spark__area" />
            <path d={path} className="spark__line" />
          </svg>
        </div>
      )}
      {byGame.length > 0 && (
        <div className="card">
          <h2 className="sec sec--in">Nach Spiel</h2>
          <ul className="list">
            {byGame.map(([g, v]) => (
              <li key={g}><span>{gameById(g)?.name ?? g}</span><small>{v.n} Runden</small><b className={v.net >= 0 ? "pos" : "neg"}>{v.net >= 0 ? "+" : ""}{fmt(Math.round(v.net * 100) / 100)}</b></li>
            ))}
          </ul>
        </div>
      )}
      <div className="card">
        <h2 className="sec sec--in">Wettverlauf</h2>
        {mine.length === 0 ? <p className="muted">Noch keine Runden gespielt.</p> : (
          <ul className="list">
            {mine.slice(0, 40).map((h) => (
              <li key={h.t + h.game + h.bet}>
                <span>{gameById(h.game)?.name}</span>
                <small>{new Date(h.t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · Einsatz {h.bet}</small>
                <b className={h.payout - h.bet >= 0 ? "pos" : "neg"}>{h.payout - h.bet >= 0 ? "+" : ""}{Math.round((h.payout - h.bet) * 100) / 100}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
