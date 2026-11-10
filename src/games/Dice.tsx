import { useState } from "react";
import { useStore } from "../store";
import { forced } from "../lib/control";
import { rand, round2 } from "../lib/rng";
import { play } from "../lib/sound";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";

export default function Dice({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edgeFor, takeControl } = useStore();
  const edge = edgeFor("dice");
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState(50);
  const [over, setOver] = useState(true);
  const [roll, setRoll] = useState<number | null>(null);
  const [res, setRes] = useState<{ bet: number; payout: number } | null>(null);
  const [rolling, setRolling] = useState(false);
  const { done } = useBetGuard();

  const chance = over ? 100 - target : target; // in Prozent
  const mult = round2(((1 - edge) * 100) / chance);

  const go = () => {
    if (!placeBet(bet)) return;
    setRolling(true);
    setRes(null);
    for (let i = 0; i < 6; i++) setTimeout(() => play("tick"), i * 65);
    const ctrl = takeControl();
    const r = forced(ctrl, () => Math.floor(rand() * 10000) / 100, (x) => ((over ? x > target : x < target) ? "win" : "loss")); // 0.00–99.99
    setTimeout(() => {
      const win = over ? r > target : r < target;
      const payout = win ? round2(bet * mult) : 0;
      setRoll(r);
      setRes({ bet, payout });
      settle("dice", bet, payout);
      setRolling(false);
    }, 450);
  };

  return (
    <GameShell id="dice" onBack={onBack} rules="Wähle eine Zielzahl und ob der Wurf (0–100) darüber oder darunter liegt. Je kleiner die Gewinnchance, desto höher der Multiplikator.">
      <div className="dice">
        <div className={`dice__roll ${rolling ? "is-rolling" : ""}`}>{roll === null ? "–" : roll.toFixed(2)}</div>
        <div className="dice__track" aria-hidden="true">
          <div className="dice__fill" style={{ left: over ? `${target}%` : 0, right: over ? 0 : `${100 - target}%` }} />
          {roll !== null && <div className="dice__marker" style={{ left: `${roll}%` }} />}
        </div>
        <label className="sr-only" htmlFor="dice-target">Zielzahl</label>
        <input id="dice-target" className="range" data-lenis-prevent type="range" min={2} max={98} value={target} onChange={(e) => setTarget(Number(e.target.value))} disabled={rolling} />
        <div className="stats3">
          <div><span>Ziel</span><b>{over ? ">" : "<"} {target}</b></div>
          <div><span>Chance</span><b>{chance} %</b></div>
          <div><span>Multiplikator</span><b>{mult.toFixed(2)}×</b></div>
        </div>
        <div className="seg">
          <button className={!over ? "is-on" : ""} onClick={() => setOver(false)} disabled={rolling}>Darunter</button>
          <button className={over ? "is-on" : ""} onClick={() => setOver(true)} disabled={rolling}>Darüber</button>
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} />}
        <BetInput value={bet} onChange={setBet} disabled={rolling} />
        <Action onClick={go} disabled={rolling || done}>{done ? "Turnier-Runden aufgebraucht" : "Würfeln"}</Action>
      </div>
    </GameShell>
  );
}
