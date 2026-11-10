import { useState } from "react";
import { useStore } from "../store";
import { forced, kindOf } from "../lib/control";
import { deck, type Card } from "../lib/cards";
import { Action, BetInput, GameShell, Outcome, PlayingCard, useBetGuard } from "../components/ui";

type Side = "dragon" | "tiger" | "tie";
const v = (c: Card) => (c.r === 14 ? 1 : c.r); // Ass niedrig

export default function DragonTiger({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, s, takeControl } = useStore();
  const [bet, setBet] = useState(10);
  const [side, setSide] = useState<Side>("dragon");
  const [cards, setCards] = useState<[Card, Card] | null>(null);
  const [res, setRes] = useState<{ bet: number; payout: number; text: string } | null>(null);
  const { done } = useBetGuard();

  const play = () => {
    if (!placeBet(bet)) return;
    const deal = () => {
      const d = deck(8);
      const dc = d.pop()!, tc = d.pop()!;
      const w: Side = v(dc) > v(tc) ? "dragon" : v(tc) > v(dc) ? "tiger" : "tie";
      let payout = 0;
      if (w === "tie") payout = side === "tie" ? bet * 9 : bet / 2; // halber Einsatz zurück
      else if (w === side) payout = bet * 2;
      return { dc, tc, w, payout };
    };
    const { dc, tc, w, payout } = forced(takeControl(), deal, (x) => kindOf(bet, x.payout));
    setCards([dc, tc]);
    setRes({ bet, payout, text: w === "tie" ? "Gleichstand" : `${w === "dragon" ? "Dragon" : "Tiger"} gewinnt` });
    settle("dragontiger", bet, payout);
  };

  return (
    <GameShell id="dragontiger" onBack={onBack} rules="Je eine Karte für Dragon und Tiger, die höhere gewinnt (Ass = 1). Dragon/Tiger zahlen 1:1, Gleichstand 8:1. Bei Gleichstand bekommst du auf Dragon/Tiger die Hälfte zurück.">
      <div className="table">
        <div className="dt">
          <div className="dt__side"><span>Dragon</span>{cards ? <PlayingCard c={cards[0]} /> : <PlayingCard hidden />}</div>
          <div className="dt__vs">VS</div>
          <div className="dt__side"><span>Tiger</span>{cards ? <PlayingCard c={cards[1]} /> : <PlayingCard hidden />}</div>
        </div>
        {s.settings.training && <p className="coach">Trainer: Gleichstand trifft selten (≈ 7,5 %). Dragon und Tiger haben exakt dieselbe Chance.</p>}
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        <div className="seg seg--3">
          <button className={side === "dragon" ? "is-on" : ""} onClick={() => setSide("dragon")}>Dragon</button>
          <button className={side === "tie" ? "is-on" : ""} onClick={() => setSide("tie")}>Gleich 8:1</button>
          <button className={side === "tiger" ? "is-on" : ""} onClick={() => setSide("tiger")}>Tiger</button>
        </div>
        <BetInput value={bet} onChange={setBet} />
        <Action onClick={play} disabled={done}>Karten ziehen</Action>
      </div>
    </GameShell>
  );
}
