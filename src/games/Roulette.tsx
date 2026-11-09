import { useState } from "react";
import { useStore } from "../store";
import { randInt } from "../lib/rng";
import { Action, GameShell, Outcome, useBetGuard } from "../components/ui";
import { tap } from "../lib/haptics";

// Europäischer Kessel (eine Null)
const wheel = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const reds = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const color = (n: number) => (n === 0 ? "green" : reds.has(n) ? "red" : "black");

type BetKey = string; // "n:17" | "red" | "black" | "even" | "odd" | "low" | "high" | "d1" | "d2" | "d3"
const outside: { k: BetKey; label: string; pays: number; hit: (n: number) => boolean }[] = [
  { k: "low", label: "1–18", pays: 2, hit: (n) => n >= 1 && n <= 18 },
  { k: "even", label: "Gerade", pays: 2, hit: (n) => n !== 0 && n % 2 === 0 },
  { k: "red", label: "Rot", pays: 2, hit: (n) => reds.has(n) },
  { k: "black", label: "Schwarz", pays: 2, hit: (n) => n !== 0 && !reds.has(n) },
  { k: "odd", label: "Ungerade", pays: 2, hit: (n) => n % 2 === 1 },
  { k: "high", label: "19–36", pays: 2, hit: (n) => n >= 19 },
  { k: "d1", label: "1–12", pays: 3, hit: (n) => n >= 1 && n <= 12 },
  { k: "d2", label: "13–24", pays: 3, hit: (n) => n >= 13 && n <= 24 },
  { k: "d3", label: "25–36", pays: 3, hit: (n) => n >= 25 },
];
const chips = [1, 5, 10, 25, 100];

export default function Roulette({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, player, fmt } = useStore();
  const [chip, setChip] = useState(10);
  const [bets, setBets] = useState<Record<BetKey, number>>({});
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [last, setLast] = useState<number[]>([]);
  const [res, setRes] = useState<{ bet: number; payout: number; text: string } | null>(null);
  const { done } = useBetGuard();
  const total = Object.values(bets).reduce((a, b) => a + b, 0);

  const add = (k: BetKey) => {
    if (spinning || total + chip > player.balance) return;
    tap(); setBets((b) => ({ ...b, [k]: (b[k] ?? 0) + chip }));
  };
  const spin = () => {
    if (!total || !placeBet(total)) return;
    const n = wheel[randInt(0, 36)];
    const idx = wheel.indexOf(n);
    const seg = 360 / 37;
    setSpinning(true); setRes(null);
    setAngle((a) => a - (a % 360) + 360 * 6 + (360 - idx * seg));
    setTimeout(() => {
      let payout = 0;
      for (const [k, amt] of Object.entries(bets)) {
        if (k.startsWith("n:")) { if (Number(k.slice(2)) === n) payout += amt * 36; }
        else { const o = outside.find((x) => x.k === k)!; if (o.hit(n)) payout += amt * o.pays; }
      }
      setLast((l) => [n, ...l].slice(0, 10));
      setRes({ bet: total, payout, text: `${n} · ${color(n) === "red" ? "Rot" : color(n) === "black" ? "Schwarz" : "Null"}` });
      settle("roulette", total, payout);
      setSpinning(false);
    }, 3200);
  };

  const seg = 360 / 37;
  return (
    <GameShell id="roulette" onBack={onBack} rules="Europäisches Roulette mit einer Null. Tippe Felder an, um Chips zu setzen. Zahl zahlt 35:1, Dutzend 2:1, Rot/Schwarz, Gerade/Ungerade und Hälften 1:1.">
      <div className="roulette">
        <div className="rwheel">
          <svg viewBox="-100 -100 200 200" style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "transform 3.1s cubic-bezier(.16,1,.3,1)" : "none" }} aria-hidden="true">
            {wheel.map((n, i) => {
              const a0 = ((i * seg - seg / 2 - 90) * Math.PI) / 180, a1 = ((i * seg + seg / 2 - 90) * Math.PI) / 180;
              const r = 96;
              return (
                <g key={n}>
                  <path d={`M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`} className={`rw rw--${color(n)}`} />
                  <text transform={`rotate(${i * seg}) translate(0 -82)`} textAnchor="middle" className="rw__n">{n}</text>
                </g>
              );
            })}
            <circle r="56" className="rw__hub" />
          </svg>
          <span className="rwheel__pin" aria-hidden="true" />
        </div>
        <div className="rlast">{last.map((n, i) => <span key={i} className={`rdot rdot--${color(n)}`}>{n}</span>)}</div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        <div className="rboard">
          <button className={`rcell rcell--green ${bets["n:0"] ? "has" : ""}`} onClick={() => add("n:0")}>0{bets["n:0"] ? <i>{bets["n:0"]}</i> : null}</button>
          <div className="rgrid">
            {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`rcell rcell--${color(n)} ${bets[`n:${n}`] ? "has" : ""}`} onClick={() => add(`n:${n}`)}>
                {n}{bets[`n:${n}`] ? <i>{bets[`n:${n}`]}</i> : null}
              </button>
            ))}
          </div>
          <div className="routside">
            {outside.map((o) => (
              <button key={o.k} className={`rcell rcell--out ${o.k === "red" ? "rcell--red" : o.k === "black" ? "rcell--black" : ""} ${bets[o.k] ? "has" : ""}`} onClick={() => add(o.k)}>
                {o.label}{bets[o.k] ? <i>{bets[o.k]}</i> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="chips">
          {chips.map((c) => <button key={c} className={`chip ${chip === c ? "is-on" : ""}`} onClick={() => setChip(c)}>{c}</button>)}
          <button className="chip chip--clear" onClick={() => setBets({})} disabled={spinning}>Löschen</button>
        </div>
        <Action onClick={spin} disabled={spinning || !total || done}>{spinning ? "Dreht …" : `Drehen · ${fmt(total)}`}</Action>
      </div>
    </GameShell>
  );
}
