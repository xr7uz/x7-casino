import { useMemo, useState } from "react";
import { useStore } from "../store";
import { binom, rand, round2 } from "../lib/rng";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";
import { tap } from "../lib/haptics";

type Risk = "low" | "mid" | "high";
// Grundform der Auszahlungen (Mitte → Rand), wird auf den eingestellten RTP normiert
const shape: Record<Risk, (d: number) => number> = {
  low: (d) => 0.5 + d * d * 2.2,
  mid: (d) => 0.3 + Math.pow(d, 2.4) * 9,
  high: (d) => 0.15 + Math.pow(d, 3.2) * 60,
};

function table(rows: number, risk: Risk, edge: number) {
  const raw = Array.from({ length: rows + 1 }, (_, i) => shape[risk](Math.abs(i - rows / 2) / (rows / 2)));
  const ev = raw.reduce((s, m, i) => s + m * binom(rows, i) / 2 ** rows, 0);
  return raw.map((m) => round2((m * (1 - edge)) / ev));
}

type Ball = { id: number; path: number[]; slot: number; bet: number };

export default function Plinko({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edge } = useStore();
  const [bet, setBet] = useState(10);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState<Risk>("mid");
  const [balls, setBalls] = useState<Ball[]>([]);
  const [hit, setHit] = useState<number | null>(null);
  const [res, setRes] = useState<{ bet: number; payout: number } | null>(null);
  const mult = useMemo(() => table(rows, risk, edge), [rows, risk, edge]);
  const { done } = useBetGuard();

  const drop = () => {
    if (!placeBet(bet)) return;
    const path: number[] = [];
    let pos = 0;
    for (let r = 0; r < rows; r++) { const right = rand() < 0.5 ? 1 : 0; pos += right; path.push(pos); }
    const ball = { id: Date.now() + Math.random(), path, slot: pos, bet };
    setBalls((b) => [...b, ball]);
    const ms = rows * 110 + 150;
    setTimeout(() => {
      const payout = round2(ball.bet * mult[ball.slot]);
      setBalls((b) => b.filter((x) => x.id !== ball.id));
      setHit(ball.slot); setRes({ bet: ball.bet, payout }); settle("plinko", ball.bet, payout); tap();
    }, ms);
  };

  const W = 300, H = 300, gap = W / (rows + 2);
  const pegX = (r: number, i: number) => W / 2 + (i - r / 2) * gap;
  const pegY = (r: number) => 20 + r * ((H - 50) / rows);

  return (
    <GameShell id="plinko" onBack={onBack} rules="Die Kugel fällt durch die Stifte und springt bei jedem zufällig links oder rechts. Außen zahlt viel, ist aber selten. Mit Risiko und Reihen stellst du die Verteilung ein.">
      <div className="plinko">
        <svg viewBox={`0 0 ${W} ${H}`} className="plinko__board" aria-hidden="true">
          {Array.from({ length: rows }, (_, r) => Array.from({ length: r + 3 }, (_, i) => (
            <circle key={`${r}-${i}`} cx={pegX(r + 2, i)} cy={pegY(r)} r={2.4} className="peg" />
          )))}
          {balls.map((b) => (
            <circle key={b.id} r={5} className="ball">
              <animate attributeName="cx" dur={`${rows * 0.11}s`} fill="freeze" values={[W / 2, ...b.path.map((p, r) => pegX(r + 1, p) + gap / 2 * 0)].join(";")} />
              <animate attributeName="cy" dur={`${rows * 0.11}s`} fill="freeze" values={[0, ...b.path.map((_, r) => pegY(r) + 8)].join(";")} />
            </circle>
          ))}
        </svg>
        <div className="plinko__slots" style={{ gridTemplateColumns: `repeat(${rows + 1}, 1fr)` }}>
          {mult.map((m, i) => (
            <span key={i} className={`pslot ${hit === i ? "is-hit" : ""}`} style={{ ["--h" as string]: Math.min(1, Math.log10(m + 1) / 2) }}>{m >= 10 ? Math.round(m) : m.toFixed(1)}</span>
          ))}
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} />}
        <div className="seg seg--3">
          {(["low", "mid", "high"] as Risk[]).map((r) => <button key={r} className={risk === r ? "is-on" : ""} onClick={() => setRisk(r)} disabled={balls.length > 0}>{r === "low" ? "Niedrig" : r === "mid" ? "Mittel" : "Hoch"}</button>)}
        </div>
        <div className="seg seg--3">
          {[8, 12, 16].map((n) => <button key={n} className={rows === n ? "is-on" : ""} onClick={() => setRows(n)} disabled={balls.length > 0}>{n} Reihen</button>)}
        </div>
        <BetInput value={bet} onChange={setBet} />
        <Action onClick={drop} disabled={done}>Kugel fallen lassen</Action>
      </div>
    </GameShell>
  );
}
