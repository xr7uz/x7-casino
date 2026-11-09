import { useRef, useState } from "react";
import { useStore } from "../store";
import { deck, type Card } from "../lib/cards";
import { round2 } from "../lib/rng";
import { Action, BetInput, GameShell, Outcome, PlayingCard, useBetGuard } from "../components/ui";

// Ränge 2..14, gleichwahrscheinlich (endloser Kartenstapel)
const pHigher = (r: number) => (14 - r) / 13;
const pLower = (r: number) => (r - 2) / 13;

export default function HiLo({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, edge } = useStore();
  const [bet, setBet] = useState(10);
  const [card, setCard] = useState<Card | null>(null);
  const [trail, setTrail] = useState<Card[]>([]);
  const [mult, setMult] = useState(1);
  const [active, setActive] = useState(false);
  const [res, setRes] = useState<{ bet: number; payout: number; text?: string } | null>(null);
  const d = useRef<Card[]>(deck(4));
  const { done } = useBetGuard();
  const draw = () => { if (d.current.length < 10) d.current = deck(4); return d.current.pop()!; };

  const start = () => {
    if (!placeBet(bet)) return;
    const c = draw();
    setCard(c); setTrail([c]); setMult(1); setActive(true); setRes(null);
  };
  const guess = (hi: boolean) => {
    if (!card) return;
    const p = hi ? pHigher(card.r) : pLower(card.r);
    if (p <= 0) return;
    const n = draw();
    const ok = hi ? n.r > card.r : n.r < card.r;
    setTrail((t) => [...t, n].slice(-6)); setCard(n);
    if (n.r === card.r) return; // gleiche Karte: nichts passiert, weiter
    if (!ok) { setActive(false); setRes({ bet, payout: 0, text: "Falsch geraten" }); settle("hilo", bet, 0); return; }
    setMult((m) => round2(m * ((1 - edge) / p)));
  };
  const cash = () => {
    const payout = round2(bet * mult);
    setActive(false); setRes({ bet, payout, text: `${mult.toFixed(2)}× Serie` }); settle("hilo", bet, payout);
  };
  const ph = card ? pHigher(card.r) : 0, pl = card ? pLower(card.r) : 0;

  return (
    <GameShell id="hilo" onBack={onBack} rules="Rate, ob die nächste Karte höher oder niedriger ist. Jeder Treffer multipliziert deinen Gewinn. Gleicher Wert: neue Karte, nichts passiert. Steig jederzeit aus.">
      <div className="table">
        <div className="hilo__trail">{trail.map((c, i) => <PlayingCard key={i} c={c} small={i < trail.length - 1} />)}</div>
        <div className="stats3">
          <div><span>Serie</span><b>{mult.toFixed(2)}×</b></div>
          <div><span>Höher</span><b>{card ? `${Math.round(ph * 100)} %` : "–"}</b></div>
          <div><span>Niedriger</span><b>{card ? `${Math.round(pl * 100)} %` : "–"}</b></div>
        </div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        {active ? (
          <>
            <div className="actions2">
              <Action tone="ghost" onClick={() => guess(true)} disabled={ph <= 0}>Höher · {ph > 0 ? round2((1 - edge) / ph).toFixed(2) : "–"}×</Action>
              <Action tone="ghost" onClick={() => guess(false)} disabled={pl <= 0}>Niedriger · {pl > 0 ? round2((1 - edge) / pl).toFixed(2) : "–"}×</Action>
            </div>
            <Action tone="win" onClick={cash} disabled={mult <= 1}>Auszahlen · {round2(bet * mult)}</Action>
          </>
        ) : (
          <>
            <BetInput value={bet} onChange={setBet} />
            <Action onClick={start} disabled={done}>Erste Karte</Action>
          </>
        )}
      </div>
    </GameShell>
  );
}
