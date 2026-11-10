import { useRef, useState } from "react";
import { useStore } from "../store";
import { forced, kindOf } from "../lib/control";
import { deck, type Card } from "../lib/cards";
import { round2 } from "../lib/rng";
import { Action, BetInput, GameShell, Outcome, PlayingCard, useBetGuard } from "../components/ui";

// Jacks or Better (9/6) – Auszahlung inkl. Einsatz
const PAY: { name: string; x: number }[] = [
  { name: "Royal Flush", x: 800 }, { name: "Straight Flush", x: 50 }, { name: "Vierling", x: 25 }, { name: "Full House", x: 9 },
  { name: "Flush", x: 6 }, { name: "Straße", x: 4 }, { name: "Drilling", x: 3 }, { name: "Zwei Paare", x: 2 }, { name: "Buben oder besser", x: 1 },
];

function rank5(h: Card[]): number {
  // Index in PAY oder -1
  const rs = h.map((c) => c.r).sort((a, b) => a - b);
  const flush = h.every((c) => c.s === h[0].s);
  const uniq = [...new Set(rs)];
  const wheel = uniq.length === 5 && rs[4] === 14 && rs[0] === 2 && rs[3] === 5;
  const straight = uniq.length === 5 && (rs[4] - rs[0] === 4 || wheel);
  const counts = Object.values(rs.reduce<Record<number, number>>((a, r) => ((a[r] = (a[r] ?? 0) + 1), a), {})).sort((a, b) => b - a);
  if (straight && flush) return rs[0] === 10 ? 0 : 1;
  if (counts[0] === 4) return 2;
  if (counts[0] === 3 && counts[1] === 2) return 3;
  if (flush) return 4;
  if (straight) return 5;
  if (counts[0] === 3) return 6;
  if (counts[0] === 2 && counts[1] === 2) return 7;
  if (counts[0] === 2) { const pr = rs.find((r) => rs.filter((x) => x === r).length === 2)!; return pr >= 11 ? 8 : -1; }
  return -1;
}

export default function VideoPoker({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, takeControl } = useStore();
  const [bet, setBet] = useState(10);
  const [hand, setHand] = useState<Card[]>([]);
  const [hold, setHold] = useState<boolean[]>([false, false, false, false, false]);
  const [phase, setPhase] = useState<"bet" | "draw">("bet");
  const [res, setRes] = useState<{ bet: number; payout: number; text: string } | null>(null);
  const d = useRef<Card[]>([]);
  const ctrl = useRef<"win" | "loss" | null>(null);
  const { done } = useBetGuard();
  const cur = hand.length === 5 ? rank5(hand) : -1;

  const deal = () => {
    if (!placeBet(bet)) return;
    ctrl.current = takeControl();
    d.current = deck(1);
    setHand(Array.from({ length: 5 }, () => d.current.pop()!)); setHold([false, false, false, false, false]); setPhase("draw"); setRes(null);
  };
  const draw = () => {
    // Neue Karten ziehen; bei Vorgabe so lange neu, bis das Ergebnis passt
    const make = () => {
      const rest = deck(1).filter((c) => !hand.some((h) => h.r === c.r && h.s === c.s));
      return hand.map((c, i) => (hold[i] ? c : rest.pop()!));
    };
    const final = forced(ctrl.current, make, (h) => { const r = rank5(h); return kindOf(bet, r >= 0 ? bet * PAY[r].x : 0); });
    const r = rank5(final);
    const payout = r >= 0 ? round2(bet * PAY[r].x) : 0;
    setHand(final); setPhase("bet");
    setRes({ bet, payout, text: r >= 0 ? PAY[r].name : "Keine Gewinnhand" }); settle("videopoker", bet, payout);
  };

  return (
    <GameShell id="videopoker" onBack={onBack} rules="Jacks or Better: Du bekommst 5 Karten. Tippe die Karten an, die du halten willst, und zieh dann neu. Ab einem Paar Buben zahlt die Hand laut Tabelle.">
      <div className="table vpoker">
        <ul className="vpoker__pay">
          {PAY.map((p, i) => <li key={p.name} className={cur === i && phase === "draw" ? "is-hit" : res && res.text === p.name ? "is-hit" : ""}><span>{p.name}</span><b>{p.x}×</b></li>)}
        </ul>
        <div className="vpoker__hand">
          {(hand.length ? hand : Array.from({ length: 5 }, () => undefined)).map((c, i) => (
            <button key={i} className={`vcard ${hold[i] ? "is-held" : ""}`} disabled={phase !== "draw"} onClick={() => setHold((h) => h.map((v, k) => (k === i ? !v : v)))}>
              <PlayingCard c={c} hidden={!c} />
              <span>{hold[i] ? "HALTEN" : ""}</span>
            </button>
          ))}
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        {phase === "draw" ? <Action onClick={draw}>Ziehen</Action> : (
          <>
            <BetInput value={bet} onChange={setBet} />
            <Action onClick={deal} disabled={done}>Austeilen</Action>
          </>
        )}
      </div>
    </GameShell>
  );
}
