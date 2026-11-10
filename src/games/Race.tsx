import { useMemo, useState } from "react";
import { useStore } from "../store";
import { forced, kindOf } from "../lib/control";
import { pickWeighted, rand, round2 } from "../lib/rng";
import { play } from "../lib/sound";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";

const HORSES = [
  { name: "Burgund Blitz", color: "#800021", w: 30 },
  { name: "Rosé Rakete", color: "#c24366", w: 24 },
  { name: "Pink Panter", color: "#ff69b4", w: 18 },
  { name: "Goldjunge", color: "#ffd166", w: 13 },
  { name: "Mitternacht", color: "#5ec2ff", w: 9 },
  { name: "Außenseiter", color: "#7ee08a", w: 6 },
];

export default function Race({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edgeFor, takeControl } = useStore();
  const edge = edgeFor("race");
  const [bet, setBet] = useState(10);
  const [pick, setPick] = useState(0);
  const [pos, setPos] = useState<number[]>(HORSES.map(() => 0));
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [res, setRes] = useState<{ bet: number; payout: number; text: string } | null>(null);
  const W = HORSES.reduce((a, h) => a + h.w, 0);
  const odds = useMemo(() => HORSES.map((h) => round2((1 - edge) / (h.w / W))), [edge, W]);
  const { done } = useBetGuard();

  const start = () => {
    if (!placeBet(bet)) return;
    const win = forced(takeControl(), () => pickWeighted(HORSES.map((h, i) => ({ item: i, w: h.w }))), (x) => kindOf(1, x === pick ? odds[pick] : 0));
    setRunning(true); setWinner(null); setRes(null); play("press");
    // Rennen animieren: Sieger kommt sicher zuerst an, andere mit Abstand
    const finishAt = HORSES.map((_, i) => (i === win ? 1 : 1.04 + rand() * 0.25));
    const speedVar = HORSES.map(() => 0.6 + rand() * 0.8);
    const t0 = performance.now(), dur = 4200;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setPos(HORSES.map((_, i) => {
        const wobble = Math.sin(k * 9 * speedVar[i] + i) * 0.04 * (1 - k);
        return Math.min(1, (k / finishAt[i]) + wobble * k);
      }));
      if (Math.random() < 0.25) play("tick");
      if (k < 1) { requestAnimationFrame(step); return; }
      const payout = win === pick ? round2(bet * odds[pick]) : 0;
      setWinner(win); setRunning(false);
      setRes({ bet, payout, text: `${HORSES[win].name} gewinnt` }); settle("race", bet, payout);
    };
    requestAnimationFrame(step);
  };

  return (
    <GameShell id="race" onBack={onBack} rules="Setz auf eines von sechs Pferden. Die Quote zeigt, wie viel ein Sieg zahlt – Favoriten gewinnen öfter, zahlen aber weniger.">
      <div className="race">
        <div className="track">
          {HORSES.map((h, i) => (
            <div key={h.name} className={`lane2 ${pick === i ? "is-pick" : ""} ${winner === i ? "is-win" : ""}`}>
              <span className="horse" style={{ left: `calc(${pos[i] * 88}% )`, background: h.color }}>{i + 1}</span>
            </div>
          ))}
          <span className="finish" aria-hidden="true" />
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        <div className="horses">
          {HORSES.map((h, i) => (
            <button key={h.name} className={`hpick ${pick === i ? "is-on" : ""}`} onClick={() => setPick(i)} disabled={running}>
              <i style={{ background: h.color }}>{i + 1}</i><span>{h.name}</span><b>{odds[i].toFixed(2)}×</b>
            </button>
          ))}
        </div>
        <BetInput value={bet} onChange={setBet} disabled={running} />
        <Action onClick={start} disabled={running || done}>{running ? "Rennen läuft …" : `Auf ${HORSES[pick].name} setzen`}</Action>
      </div>
    </GameShell>
  );
}
