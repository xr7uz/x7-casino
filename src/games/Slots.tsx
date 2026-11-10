import { useMemo, useState } from "react";
import { useStore } from "../store";
import { forced, kindOf } from "../lib/control";
import { pickWeighted, round2 } from "../lib/rng";
import { play } from "../lib/sound";
import { Action, BetInput, GameShell, Outcome, useBetGuard } from "../components/ui";

// Symbole mit Gewicht (Häufigkeit) und Basis-Auszahlung für drei gleiche
const SYM = [
  { s: "🍒", w: 30, base: 5 },
  { s: "🍋", w: 24, base: 8 },
  { s: "🔔", w: 16, base: 15 },
  { s: "💎", w: 9, base: 40 },
  { s: "7", w: 5, base: 120 },
  { s: "X7", w: 2, base: 600 },
];
const W = SYM.reduce((a, b) => a + b.w, 0);
const P = (w: number) => w / W;

function paytable(edge: number) {
  // Kirschen: zwei beliebige Kirschen zahlen ebenfalls
  const cherryTwo = 3 * P(30) ** 2 * (1 - P(30));
  const rawEv = SYM.reduce((s, x) => s + P(x.w) ** 3 * x.base, 0) + cherryTwo * 1.5;
  const k = (1 - edge) / rawEv;
  return { three: SYM.map((x) => round2(x.base * k)), cherry2: round2(1.5 * k) };
}

export default function Slots({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edgeFor, takeControl } = useStore();
  const edge = edgeFor("slots");
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState([0, 3, 5]);
  const [spin, setSpin] = useState(false);
  const [res, setRes] = useState<{ bet: number; payout: number; text?: string } | null>(null);
  const pay = useMemo(() => paytable(edge), [edge]);
  const { done } = useBetGuard();

  const go = () => {
    if (!placeBet(bet)) return;
    const pick = () => pickWeighted(SYM.map((x, i) => ({ item: i, w: x.w })));
    const payOf = (r: number[]) => (r[0] === r[1] && r[1] === r[2] ? pay.three[r[0]] : r.filter((x) => x === 0).length === 2 ? pay.cherry2 : 0);
    const r = forced(takeControl(), () => [pick(), pick(), pick()], (x) => kindOf(1, payOf(x)));
    setSpin(true); setRes(null);
    for (let i = 0; i < 14; i++) setTimeout(() => play("tick"), i * 75);
    setTimeout(() => {
      setReels(r);
      let payout = 0, text = "";
      if (r[0] === r[1] && r[1] === r[2]) { payout = round2(bet * pay.three[r[0]]); text = `Drei ${SYM[r[0]].s}`; }
      else if (r.filter((x) => x === 0).length === 2) { payout = round2(bet * pay.cherry2); text = "Zwei Kirschen"; }
      setRes({ bet, payout, text }); settle("slots", bet, payout); setSpin(false);
    }, 1100);
  };

  return (
    <GameShell id="slots" onBack={onBack} rules="Drei Walzen, eine Gewinnlinie. Drei gleiche Symbole zahlen laut Tabelle, zwei Kirschen zahlen ebenfalls.">
      <div className="slots">
        <div className="slots__machine">
          {reels.map((r, i) => (
            <div key={i} className={`reel ${spin ? "is-spin" : ""}`} style={{ ["--i" as string]: i }}>
              <span className={SYM[r].s.length > 1 || SYM[r].s === "7" ? "reel__txt" : ""}>{SYM[r].s}</span>
            </div>
          ))}
          <span className="slots__line" aria-hidden="true" />
        </div>
        <div className="paytable">
          {SYM.map((x, i) => <span key={x.s}><b className={x.s.length > 1 || x.s === "7" ? "reel__txt" : ""}>{x.s}{x.s}{x.s}</b>{pay.three[i]}×</span>).reverse()}
          <span><b>🍒🍒</b>{pay.cherry2}×</span>
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        <BetInput value={bet} onChange={setBet} disabled={spin} />
        <Action onClick={go} disabled={spin || done}>{spin ? "Dreht …" : "Drehen"}</Action>
      </div>
    </GameShell>
  );
}
