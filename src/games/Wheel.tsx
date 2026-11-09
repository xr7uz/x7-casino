import { useMemo, useState } from "react";
import { useStore } from "../store";
import { randInt, round2 } from "../lib/rng";
import { play } from "../lib/sound";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";

type Risk = "low" | "mid" | "high";
const SEG = 20;
const layouts: Record<Risk, number[]> = {
  low: [1.5, 1.2, 0, 1.2, 1.5, 1.2, 0, 1.2, 1.5, 1.2, 0, 1.2, 1.5, 1.2, 0, 1.2, 1.5, 1.2, 0, 1.2],
  mid: [0, 1.5, 0, 2, 0, 1.5, 0, 3, 0, 1.5, 0, 2, 0, 1.5, 0, 5, 0, 1.5, 0, 2],
  high: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20],
};
const palette = ["#800021", "#881144", "#c24366", "#ff69b4", "#ffe4d8"];

export default function Wheel({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edge } = useStore();
  const [bet, setBet] = useState(10);
  const [risk, setRisk] = useState<Risk>("mid");
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [res, setRes] = useState<{ bet: number; payout: number; text: string } | null>(null);
  const segs = useMemo(() => {
    const raw = layouts[risk];
    const ev = raw.reduce((a, b) => a + b, 0) / SEG;
    return raw.map((m) => round2((m * (1 - edge)) / ev));
  }, [risk, edge]);
  const uniq = [...new Set(segs)].sort((a, b) => a - b);
  const colorOf = (m: number) => (m === 0 ? "var(--wheel-zero)" : palette[Math.min(palette.length - 1, uniq.filter((x) => x > 0).indexOf(m))]);
  const { done } = useBetGuard();

  const spin = () => {
    if (!placeBet(bet)) return;
    const i = randInt(0, SEG - 1);
    const seg = 360 / SEG;
    setSpinning(true); setRes(null); play("spin");
    setAngle((a) => a - (a % 360) + 360 * 5 + (360 - i * seg));
    setTimeout(() => {
      const payout = round2(bet * segs[i]);
      setRes({ bet, payout, text: `${segs[i].toFixed(2)}×` }); settle("wheel", bet, payout); setSpinning(false);
    }, 3300);
  };

  const seg = 360 / SEG;
  return (
    <GameShell id="wheel" onBack={onBack} rules="Das Rad hat 20 Felder. Wo der Zeiger stoppt, wird dein Einsatz mit dem Feld multipliziert. Höheres Risiko: mehr Nullen, größere Treffer.">
      <div className="wheelg">
        <div className="bigwheel">
          <svg viewBox="-100 -100 200 200" style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "transform 3.2s cubic-bezier(.16,1,.3,1)" : "none" }} aria-hidden="true">
            {segs.map((m, i) => {
              const a0 = ((i * seg - seg / 2 - 90) * Math.PI) / 180, a1 = ((i * seg + seg / 2 - 90) * Math.PI) / 180;
              return (
                <g key={i}>
                  <path d={`M0 0 L${96 * Math.cos(a0)} ${96 * Math.sin(a0)} A96 96 0 0 1 ${96 * Math.cos(a1)} ${96 * Math.sin(a1)} Z`} fill={colorOf(m)} stroke="rgba(0,0,0,.35)" strokeWidth="0.6" />
                  <text transform={`rotate(${i * seg}) translate(0 -74)`} textAnchor="middle" className="bw__n">{m ? `${m}×` : "0"}</text>
                </g>
              );
            })}
            <circle r="26" className="bw__hub" />
          </svg>
          <span className="bigwheel__pin" aria-hidden="true" />
        </div>
        <div className="legend">{uniq.map((m) => <span key={m}><i style={{ background: colorOf(m) }} />{m.toFixed(2)}×</span>)}</div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        <div className="seg seg--3">
          {(["low", "mid", "high"] as Risk[]).map((r) => <button key={r} className={risk === r ? "is-on" : ""} onClick={() => setRisk(r)} disabled={spinning}>{r === "low" ? "Niedrig" : r === "mid" ? "Mittel" : "Hoch"}</button>)}
        </div>
        <BetInput value={bet} onChange={setBet} disabled={spinning} />
        <Action onClick={spin} disabled={spinning || done}>{spinning ? "Dreht …" : "Drehen"}</Action>
      </div>
    </GameShell>
  );
}
