import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { rand, round2 } from "../lib/rng";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";
import { tap } from "../lib/haptics";

type Phase = "idle" | "flying" | "crashed" | "cashed";

export default function Crash({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edge } = useStore();
  const [bet, setBet] = useState(10);
  const [auto, setAuto] = useState(2);
  const [phase, setPhase] = useState<Phase>("idle");
  const [m, setM] = useState(1);
  const [res, setRes] = useState<{ bet: number; payout: number } | null>(null);
  const [recent, setRecent] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const crashAt = useRef(1);
  const raf = useRef(0);
  const start = useRef(0);
  const cashed = useRef(false);
  const pts = useRef<number[]>([]);
  const { done } = useBetGuard();

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const finish = (payout: number, crash: number) => {
    setRes({ bet, payout });
    settle("crash", bet, payout);
    setRecent((r) => [round2(crash), ...r].slice(0, 8));
  };

  const go = () => {
    if (!placeBet(bet)) return;
    // Absturzpunkt: P(Crash ≥ x) = (1 − Hausvorteil) / x
    const u = rand();
    crashAt.current = Math.max(1, Math.floor(((1 - edge) / (1 - u)) * 100) / 100);
    cashed.current = false;
    pts.current = [];
    setRes(null);
    setPhase("flying");
    setRunning(true);
    start.current = performance.now();
    const step = (t: number) => {
      const sec = (t - start.current) / 1000;
      const cur = Math.pow(Math.E, 0.16 * sec * (1 + sec * 0.06));
      pts.current.push(cur);
      if (!cashed.current && auto > 1 && cur >= auto && auto < crashAt.current) {
        cashed.current = true;
        setPhase("cashed");
        tap("medium");
        finish(round2(bet * auto), crashAt.current);
      }
      if (cur >= crashAt.current) {
        setM(crashAt.current);
        if (!cashed.current) { setPhase("crashed"); finish(0, crashAt.current); }
        else setPhase("cashed");
        tap("heavy");
        setRunning(false);
        return;
      }
      setM(cur);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const cashOut = () => {
    if (phase !== "flying" || cashed.current) return;
    cashed.current = true;
    setPhase("cashed");
    finish(round2(bet * m), crashAt.current);
  };

  // Kurve
  const data = pts.current;
  const maxM = Math.max(2, m * 1.15);
  const path = data.length
    ? data.map((v, i) => `${i ? "L" : "M"}${(i / Math.max(60, data.length)) * 300},${150 - ((v - 1) / (maxM - 1)) * 140}`).join(" ")
    : "";

  return (
    <GameShell id="crash" onBack={onBack} rules="Der Multiplikator steigt, bis er zufällig abstürzt. Steig vorher aus (oder setz ein Auto-Ziel), um Einsatz × Multiplikator zu erhalten.">
      <div className="crash">
        <div className="crash__recent">{recent.map((r, i) => <span key={i} className={r >= 2 ? "hi" : ""}>{r.toFixed(2)}×</span>)}</div>
        <div className={`crash__stage is-${phase}`}>
          <svg viewBox="0 0 300 150" preserveAspectRatio="none" aria-hidden="true">
            <path d={path} className="crash__line" />
          </svg>
          <div className="crash__m">{m.toFixed(2)}×</div>
          {phase === "crashed" && <div className="crash__tag">Geplatzt</div>}
          {phase === "cashed" && <div className="crash__tag crash__tag--win">Ausgestiegen</div>}
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={`Absturz bei ${crashAt.current.toFixed(2)}×`} />}
        <BetInput value={bet} onChange={setBet} disabled={running} />
        <div className="bet">
          <label className="bet__label" htmlFor="auto">Auto-Ausstieg bei<span>0 = aus</span></label>
          <input id="auto" type="number" step="0.1" min={0} value={auto} onChange={(e) => setAuto(Number(e.target.value))} disabled={running} />
        </div>
        {phase === "flying" && !cashed.current
          ? <Action tone="win" onClick={cashOut}>Aussteigen · {round2(bet * m)}</Action>
          : <Action onClick={go} disabled={running || done}>{running ? "Läuft …" : "Einsatz setzen"}</Action>}
      </div>
    </GameShell>
  );
}
