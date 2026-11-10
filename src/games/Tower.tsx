import { useRef, useState } from "react";
import { LuGem, LuSkull } from "react-icons/lu";
import { useStore } from "../store";
import { rand, randInt, round2 } from "../lib/rng";
import { play } from "../lib/sound";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";

type Diff = "easy" | "mid" | "hard";
// Türen pro Etage und davon sichere
const cfg: Record<Diff, { doors: number; safe: number }> = { easy: { doors: 4, safe: 3 }, mid: { doors: 3, safe: 2 }, hard: { doors: 3, safe: 1 } };
const LEVELS = 8;

export default function Tower({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edgeFor, takeControl } = useStore();
  const edge = edgeFor("tower");
  const [bet, setBet] = useState(10);
  const [diff, setDiff] = useState<Diff>("mid");
  const [level, setLevel] = useState(0);
  const [active, setActive] = useState(false);
  const [rows, setRows] = useState<{ pick: number; traps: number[] }[]>([]);
  const [res, setRes] = useState<{ bet: number; payout: number } | null>(null);
  const ctrl = useRef<"win" | "loss" | null>(null);
  const { done } = useBetGuard();
  const { doors, safe } = cfg[diff];
  const p = safe / doors;
  const multAt = (l: number) => (l <= 0 ? 1 : round2((1 - edge) / Math.pow(p, l)));

  const start = () => { if (!placeBet(bet)) return; ctrl.current = takeControl(); setLevel(0); setRows([]); setActive(true); setRes(null); };
  const choose = (door: number) => {
    if (!active) return;
    const hit = ctrl.current === "win" ? false : ctrl.current === "loss" ? true : rand() >= p;
    // Fallen so verteilen, dass sie zum Ergebnis passen
    const others = Array.from({ length: doors }, (_, i) => i).filter((i) => i !== door);
    const traps: number[] = [];
    const nTraps = doors - safe;
    if (hit) traps.push(door);
    while (traps.length < nTraps) { const c = others[randInt(0, others.length - 1)]; if (!traps.includes(c)) traps.push(c); }
    setRows((r) => [...r, { pick: door, traps }]);
    if (hit) { play("boom"); setActive(false); setRes({ bet, payout: 0 }); settle("tower", bet, 0); return; }
    play("reveal");
    const l = level + 1; setLevel(l);
    if (l === LEVELS) cash(l);
  };
  const cash = (l = level) => { const payout = round2(bet * multAt(l)); setActive(false); setRes({ bet, payout }); settle("tower", bet, payout); };

  return (
    <GameShell id="tower" onBack={onBack} rules="Klettere Etage für Etage nach oben. Auf jeder Etage ist hinter einer oder mehreren Türen eine Falle. Jede geschaffte Etage erhöht den Multiplikator – steig rechtzeitig aus.">
      <div className="tower">
        <div className="tower__grid">
          {Array.from({ length: LEVELS }, (_, i) => LEVELS - 1 - i).map((l) => {
            const row = rows[l];
            const current = active && l === level;
            return (
              <div key={l} className={`trow ${current ? "is-current" : ""} ${l < level ? "is-done" : ""}`}>
                <span className="trow__m">{multAt(l + 1).toFixed(2)}×</span>
                <div className="trow__doors" style={{ gridTemplateColumns: `repeat(${doors}, 1fr)` }}>
                  {Array.from({ length: doors }, (_, d) => {
                    const shown = !!row;
                    const trap = row?.traps.includes(d);
                    return (
                      <button key={d} className={`door ${shown ? (trap ? "door--trap" : "door--safe") : ""} ${row?.pick === d ? "door--picked" : ""}`} disabled={!current} onClick={() => choose(d)} aria-label={`Etage ${l + 1}, Tür ${d + 1}`}>
                        {shown ? (trap ? <LuSkull /> : <LuGem />) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} />}
        {active ? (
          <Action tone="win" onClick={() => cash()} disabled={level === 0}>Auszahlen · {round2(bet * multAt(level))}</Action>
        ) : (
          <>
            <div className="seg seg--3">
              {(["easy", "mid", "hard"] as Diff[]).map((d) => <button key={d} className={diff === d ? "is-on" : ""} onClick={() => setDiff(d)}>{d === "easy" ? "Leicht" : d === "mid" ? "Mittel" : "Schwer"}</button>)}
            </div>
            <BetInput value={bet} onChange={setBet} />
            <Action onClick={start} disabled={done}>Turm betreten</Action>
          </>
        )}
      </div>
    </GameShell>
  );
}
