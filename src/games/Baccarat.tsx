import { useState } from "react";
import { useStore } from "../store";
import { forced, kindOf } from "../lib/control";
import { deck, type Card } from "../lib/cards";
import { round2 } from "../lib/rng";
import { Action, BetInput, GameShell, Outcome, PlayingCard, useBetGuard } from "../components/ui";

type Side = "player" | "banker" | "tie";
const val = (c: Card) => (c.r >= 10 && c.r <= 13 ? 0 : c.r === 14 ? 1 : c.r);
const total = (h: Card[]) => h.reduce((s, c) => s + val(c), 0) % 10;

export default function Baccarat({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, takeControl } = useStore();
  const [bet, setBet] = useState(10);
  const [side, setSide] = useState<Side>("player");
  const [p, setP] = useState<Card[]>([]);
  const [b, setB] = useState<Card[]>([]);
  const [res, setRes] = useState<{ bet: number; payout: number; text: string } | null>(null);
  const { done } = useBetGuard();

  const play = () => {
    if (!placeBet(bet)) return;
    const deal = () => {
      const d = deck(8);
      const ph = [d.pop()!, d.pop()!], bh = [d.pop()!, d.pop()!];
      let pt = total(ph), bt = total(bh);
      if (pt < 8 && bt < 8) {
        let third: Card | null = null;
        if (pt <= 5) { third = d.pop()!; ph.push(third); }
        bt = total(bh);
        const t = third ? val(third) : -1;
        const bankerDraws = third === null ? bt <= 5
          : bt <= 2 || (bt === 3 && t !== 8) || (bt === 4 && t >= 2 && t <= 7) || (bt === 5 && t >= 4 && t <= 7) || (bt === 6 && (t === 6 || t === 7));
        if (bankerDraws) bh.push(d.pop()!);
      }
      pt = total(ph); bt = total(bh);
      const winner: Side = pt > bt ? "player" : bt > pt ? "banker" : "tie";
      let payout = 0;
      if (winner === "tie") payout = side === "tie" ? bet * 9 : bet; // Einsatz zurück bei Gleichstand
      else if (winner === side) payout = side === "banker" ? round2(bet * 1.95) : bet * 2;
      return { ph, bh, pt, bt, winner, payout };
    };
    const { ph, bh, pt, bt, winner, payout } = forced(takeControl(), deal, (x) => kindOf(bet, x.payout));
    setP(ph); setB(bh);
    const names = { player: "Spieler", banker: "Bank", tie: "Gleichstand" };
    setRes({ bet, payout, text: `${names[winner]} gewinnt · ${pt} zu ${bt}` });
    settle("baccarat", bet, payout);
  };

  return (
    <GameShell id="baccarat" onBack={onBack} rules="Setz auf Spieler (1:1), Bank (0,95:1) oder Gleichstand (8:1). Bildkarten und Zehnen zählen 0, Ass 1. Es zählt nur die Einerstelle; Dritte-Karte-Regeln wie im Casino.">
      <div className="table">
        <div className="hand"><span className="hand__label">Spieler {p.length ? `· ${total(p)}` : ""}</span><div className="hand__cards">{p.map((c, i) => <PlayingCard key={i} c={c} />)}</div></div>
        <div className="hand"><span className="hand__label">Bank {b.length ? `· ${total(b)}` : ""}</span><div className="hand__cards">{b.map((c, i) => <PlayingCard key={i} c={c} />)}</div></div>
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        <div className="seg seg--3">
          <button className={side === "player" ? "is-on" : ""} onClick={() => setSide("player")}>Spieler 1:1</button>
          <button className={side === "tie" ? "is-on" : ""} onClick={() => setSide("tie")}>Gleich 8:1</button>
          <button className={side === "banker" ? "is-on" : ""} onClick={() => setSide("banker")}>Bank 0,95:1</button>
        </div>
        <BetInput value={bet} onChange={setBet} />
        <Action onClick={play} disabled={done}>Austeilen</Action>
      </div>
    </GameShell>
  );
}
