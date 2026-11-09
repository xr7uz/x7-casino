import { useState } from "react";
import { LuBird, LuCar, LuFlag } from "react-icons/lu";
import { useStore } from "../store";
import { rand, round2 } from "../lib/rng";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";
import { tap } from "../lib/haptics";

type Diff = "easy" | "mid" | "hard";
const crashP: Record<Diff, number> = { easy: 1 / 25, mid: 3 / 25, hard: 6 / 25 };
const LANES = 10;

export default function Chicken({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edge } = useStore();
  const [bet, setBet] = useState(10);
  const [diff, setDiff] = useState<Diff>("mid");
  const [pos, setPos] = useState(-1); // -1 = noch nicht gestartet, 0 = Gehweg
  const [dead, setDead] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const [res, setRes] = useState<{ bet: number; payout: number } | null>(null);
  const { done } = useBetGuard();
  const q = 1 - crashP[diff];
  const multAt = (lane: number) => (lane <= 0 ? 1 : round2((1 - edge) / Math.pow(q, lane)));

  const start = () => { if (!placeBet(bet)) return; setPos(0); setDead(null); setActive(true); setRes(null); };
  const step = () => {
    const next = pos + 1;
    if (rand() < crashP[diff]) {
      tap("heavy"); setDead(next); setActive(false); setRes({ bet, payout: 0 }); settle("chicken", bet, 0); return;
    }
    tap(); setPos(next);
    if (next === LANES) cash(next);
  };
  const cash = (at = pos) => {
    const payout = round2(bet * multAt(at));
    setActive(false); setRes({ bet, payout }); settle("chicken", bet, payout);
  };

  return (
    <GameShell id="chicken" onBack={onBack} rules="Bring das Huhn Spur für Spur über die Straße. Jede geschaffte Spur erhöht den Multiplikator. Ein Auto erwischt dich zufällig – steig rechtzeitig aus.">
      <div className="chicken">
        <div className="road">
          <div className={`lane lane--side ${pos === 0 ? "is-here" : ""}`}>{pos <= 0 && dead === null ? <LuBird className="hen" /> : null}</div>
          {Array.from({ length: LANES }, (_, i) => i + 1).map((l) => (
            <div key={l} className={`lane ${l <= pos ? "is-done" : ""} ${dead === l ? "is-dead" : ""}`}>
              <span className="lane__m">{multAt(l).toFixed(2)}×</span>
              {pos === l && <LuBird className="hen" />}
              {dead === l && <LuCar className="car" />}
              {l === LANES && <LuFlag className="flag" />}
            </div>
          ))}
        </div>
        <div className="stats3">
          <div><span>Spur</span><b>{Math.max(0, pos)} / {LANES}</b></div>
          <div><span>Aktuell</span><b>{multAt(pos).toFixed(2)}×</b></div>
          <div><span>Nächste</span><b>{multAt(pos + 1).toFixed(2)}×</b></div>
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} />}
        {active ? (
          <div className="actions2">
            <Action onClick={step}>Weiter</Action>
            <Action tone="win" onClick={() => cash()} disabled={pos <= 0}>Auszahlen · {round2(bet * multAt(pos))}</Action>
          </div>
        ) : (
          <>
            <div className="seg seg--3">
              {(["easy", "mid", "hard"] as Diff[]).map((d) => <button key={d} className={diff === d ? "is-on" : ""} onClick={() => setDiff(d)}>{d === "easy" ? "Leicht" : d === "mid" ? "Mittel" : "Schwer"}</button>)}
            </div>
            <BetInput value={bet} onChange={setBet} />
            <Action onClick={start} disabled={done}>Losgehen</Action>
          </>
        )}
      </div>
    </GameShell>
  );
}
