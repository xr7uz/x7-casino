import { useRef, useState } from "react";
import { useStore } from "../store";
import { rand, round2 } from "../lib/rng";
import { play } from "../lib/sound";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";

type Side = "kopf" | "zahl";

export default function Coinflip({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edgeFor, takeControl } = useStore();
  const edge = edgeFor("coinflip");
  const [bet, setBet] = useState(10);
  const [side, setSide] = useState<Side>("kopf");
  const [streak, setStreak] = useState(0);
  const [face, setFace] = useState<Side>("kopf");
  const [flipping, setFlipping] = useState(false);
  const [active, setActive] = useState(false);
  const [spin, setSpin] = useState(0);
  const [res, setRes] = useState<{ bet: number; payout: number; text?: string } | null>(null);
  const ctrl = useRef<"win" | "loss" | null>(null);
  const { done } = useBetGuard();
  const mult = (n: number) => (n === 0 ? 1 : round2(Math.pow(2 * (1 - edge), n)));

  const flip = () => {
    if (!active) { if (!placeBet(bet)) return; ctrl.current = takeControl(); setActive(true); setStreak(0); }
    const win = ctrl.current === "win" ? true : ctrl.current === "loss" ? false : rand() < 0.5;
    const result: Side = win ? side : side === "kopf" ? "zahl" : "kopf";
    setFlipping(true); setRes(null); play("press");
    setSpin((s) => s + 1440 + (result === "zahl" ? 180 : 0) - (s % 360));
    setTimeout(() => {
      setFace(result); setFlipping(false);
      if (!win) { play("loss"); setActive(false); setRes({ bet, payout: 0, text: `${result === "kopf" ? "Kopf" : "Zahl"} – Serie gerissen` }); settle("coinflip", bet, 0); setStreak(0); return; }
      play("coin"); setStreak((n) => n + 1);
    }, 1100);
  };
  const cash = () => { const payout = round2(bet * mult(streak)); setActive(false); setRes({ bet, payout, text: `${streak}er Serie` }); settle("coinflip", bet, payout); setStreak(0); };

  return (
    <GameShell id="coinflip" onBack={onBack} rules="Wähle Kopf oder Zahl. Jeder Treffer verdoppelt deinen Gewinn (abzüglich Hausvorteil). Riskiere eine weitere Runde oder nimm die Serie mit.">
      <div className="coin">
        <div className="coin__stage">
          <div className={`coin__disc ${flipping ? "is-flipping" : ""}`} style={{ transform: `rotateY(${spin}deg)` }}>
            <span className="coin__face coin__face--kopf">X7</span>
            <span className="coin__face coin__face--zahl">7</span>
          </div>
        </div>
        <div className="stats3">
          <div><span>Serie</span><b>{streak}</b></div>
          <div><span>Aktuell</span><b>{mult(streak).toFixed(2)}×</b></div>
          <div><span>Nächster Treffer</span><b>{mult(streak + 1).toFixed(2)}×</b></div>
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        <div className="seg">
          <button className={side === "kopf" ? "is-on" : ""} onClick={() => setSide("kopf")} disabled={flipping}>Kopf (X7)</button>
          <button className={side === "zahl" ? "is-on" : ""} onClick={() => setSide("zahl")} disabled={flipping}>Zahl (7)</button>
        </div>
        {!active && <BetInput value={bet} onChange={setBet} disabled={flipping} />}
        <div className={active ? "actions2" : ""}>
          <Action onClick={flip} disabled={flipping || (!active && done)}>{active ? "Nochmal werfen" : "Münze werfen"}</Action>
          {active && <Action tone="win" onClick={cash} disabled={flipping || streak === 0}>Nehmen · {round2(bet * mult(streak))}</Action>}
        </div>
        <span className="sr-only">Zuletzt: {face}</span>
      </div>
    </GameShell>
  );
}
