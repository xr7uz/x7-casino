import { useState } from "react";
import { useStore } from "../store";
import { forced } from "../lib/control";
import { rand, round2 } from "../lib/rng";
import { play } from "../lib/sound";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";

export default function Limbo({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edgeFor, takeControl } = useStore();
  const edge = edgeFor("limbo");
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState(2);
  const [shown, setShown] = useState(1);
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<{ v: number; win: boolean }[]>([]);
  const [res, setRes] = useState<{ bet: number; payout: number } | null>(null);
  const { done } = useBetGuard();
  const chance = Math.min(99, ((1 - edge) / target) * 100);

  const go = () => {
    if (target < 1.01 || !placeBet(bet)) return;
    // Ergebnis: P(X ≥ x) = (1 − Hausvorteil) / x
    const v = forced(takeControl(), () => Math.max(1, Math.floor(((1 - edge) / (1 - rand())) * 100) / 100), (x) => (x >= target ? "win" : "loss"));
    setBusy(true); setRes(null);
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      setShown(round2(1 + (v - 1) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) { if (Math.random() < 0.3) play("tick"); requestAnimationFrame(step); return; }
      const win = v >= target;
      const payout = win ? round2(bet * target) : 0;
      setHist((h) => [{ v, win }, ...h].slice(0, 10)); setRes({ bet, payout }); settle("limbo", bet, payout); setBusy(false);
    };
    requestAnimationFrame(step);
  };

  return (
    <GameShell id="limbo" onBack={onBack} rules="Setz einen Ziel-Multiplikator. Ein Zufallswert wird gezogen – liegt er auf oder über deinem Ziel, gewinnst du Einsatz × Ziel. Höheres Ziel, kleinere Chance.">
      <div className="limbo">
        <div className="crash__recent">{hist.map((h, i) => <span key={i} className={h.win ? "hi" : ""}>{h.v.toFixed(2)}×</span>)}</div>
        <div className={`limbo__num ${!busy && res ? (res.payout > 0 ? "is-win" : "is-loss") : ""}`}>{shown.toFixed(2)}×</div>
        <div className="stats3">
          <div><span>Ziel</span><b>{target.toFixed(2)}×</b></div>
          <div><span>Chance</span><b>{chance.toFixed(2)} %</b></div>
          <div><span>Gewinn</span><b>{round2(bet * target)}</b></div>
        </div>
        {res && !busy && <Outcome bet={res.bet} payout={res.payout} />}
        <div className="bet">
          <label className="bet__label" htmlFor="limbo-t">Ziel-Multiplikator</label>
          <div className="bet__row">
            <input id="limbo-t" type="number" step="0.01" min={1.01} value={target} onChange={(e) => setTarget(Math.max(1.01, Number(e.target.value) || 1.01))} disabled={busy} />
            {[1.5, 2, 10].map((x) => <button key={x} onClick={() => setTarget(x)} disabled={busy}>{x}×</button>)}
          </div>
        </div>
        <BetInput value={bet} onChange={setBet} disabled={busy} />
        <Action onClick={go} disabled={busy || done}>Spielen</Action>
      </div>
    </GameShell>
  );
}
