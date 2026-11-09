import { useRef, useState } from "react";
import { useStore } from "../store";
import { deck, evalHand, handNames, type Card } from "../lib/cards";
import { rand, round2, shuffle } from "../lib/rng";
import { Action, BetInput, GameShell, Outcome, PlayingCard, useBetGuard } from "../components/ui";

type Seat = { name: string; hole: Card[]; folded: boolean; put: number; bot: boolean; last?: string };
type Street = "pre" | "flop" | "turn" | "river" | "show";
const streetName: Record<Street, string> = { pre: "Preflop", flop: "Flop", turn: "Turn", river: "River", show: "Showdown" };

/** Gewinnchance einer Hand gegen n zufällige Hände (Monte Carlo) */
function equity(hole: Card[], board: Card[], opponents: number, sims = 220): number {
  const known = new Set([...hole, ...board].map((c) => `${c.r}${c.s}`));
  const rest = deck(1).filter((c) => !known.has(`${c.r}${c.s}`));
  let wins = 0;
  for (let i = 0; i < sims; i++) {
    const d = shuffle(rest);
    const b = [...board, ...d.slice(0, 5 - board.length)];
    let k = 5 - board.length;
    const me = evalHand([...hole, ...b]).score;
    let best = true, tie = false;
    for (let o = 0; o < opponents; o++) {
      const sc = evalHand([d[k++], d[k++], ...b]).score;
      if (sc > me) { best = false; break; }
      if (sc === me) tie = true;
    }
    if (best) wins += tie ? 0.5 : 1;
  }
  return wins / sims;
}

export default function Poker({ onBack }: { onBack: () => void }) {
  const { placeBet, settle, s } = useStore();
  const [bet, setBet] = useState(10);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [board, setBoard] = useState<Card[]>([]);
  const [street, setStreet] = useState<Street | null>(null);
  const [toCall, setToCall] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [res, setRes] = useState<{ bet: number; payout: number; text: string } | null>(null);
  const d = useRef<Card[]>([]);
  const myPut = useRef(0);
  const unit = useRef(10);
  const { done } = useBetGuard();

  const pot = seats.reduce((a, x) => a + x.put, 0);
  const say = (t: string) => setLog((l) => [t, ...l].slice(0, 4));

  const deal = () => {
    const ante = bet;
    if (!placeBet(ante)) return;
    unit.current = bet; myPut.current = ante;
    d.current = deck(1);
    const take = () => d.current.pop()!;
    setSeats([
      { name: "Du", hole: [take(), take()], folded: false, put: ante, bot: false },
      { name: "Viktor", hole: [take(), take()], folded: false, put: ante, bot: true },
      { name: "Mila", hole: [take(), take()], folded: false, put: ante, bot: true },
    ]);
    setBoard([]); setStreet("pre"); setToCall(0); setRes(null); setLog(["Neue Hand – alle zahlen den Einsatz."]);
  };

  const showdown = (st: Seat[], b: Card[]) => {
    const alive = st.filter((x) => !x.folded);
    const scored = alive.map((x) => ({ x, e: evalHand([...x.hole, ...b]) }));
    const top = Math.max(...scored.map((y) => y.e.score));
    const winners = scored.filter((y) => y.e.score === top);
    const potNow = st.reduce((a, x) => a + x.put, 0);
    const meWin = winners.some((w) => !w.x.bot);
    const payout = meWin ? round2(potNow / winners.length) : 0;
    setStreet("show");
    setRes({ bet: myPut.current, payout, text: `${winners.map((w) => w.x.name).join(" & ")} · ${handNames[winners[0].e.cat]}` });
    settle("poker", myPut.current, payout);
  };

  const advance = (st: Seat[]) => {
    const alive = st.filter((x) => !x.folded);
    if (alive.length === 1) {
      const potNow = st.reduce((a, x) => a + x.put, 0);
      const meWin = !alive[0].bot;
      setStreet("show");
      setRes({ bet: myPut.current, payout: meWin ? potNow : 0, text: meWin ? "Alle Bots haben gepasst" : `${alive[0].name} gewinnt` });
      settle("poker", myPut.current, meWin ? potNow : 0);
      return;
    }
    const b = board;
    const next: Street = street === "pre" ? "flop" : street === "flop" ? "turn" : street === "turn" ? "river" : "show";
    if (next === "show") { showdown(st, b); return; }
    const nb = next === "flop" ? [d.current.pop()!, d.current.pop()!, d.current.pop()!] : [d.current.pop()!];
    setBoard([...b, ...nb]); setStreet(next); setToCall(0);
  };

  /** Bots reagieren auf deinen Einsatz (amount = 0 heißt: du hast geschoben) */
  const botsAct = (st: Seat[], amount: number): { st: Seat[]; raise: number } => {
    let raise = 0;
    const out = st.map((x) => {
      if (!x.bot || x.folded) return x;
      const eq = equity(x.hole, board, st.filter((y) => !y.folded).length - 1, 160);
      const bluff = rand() < 0.08;
      if (amount === 0) {
        if ((eq > 0.55 || bluff) && raise === 0) { raise = unit.current; return { ...x, put: x.put + unit.current, last: "setzt" }; }
        return { ...x, last: "schiebt" };
      }
      if (eq > 0.78 && raise === 0) { raise = unit.current; return { ...x, put: x.put + amount + unit.current, last: "erhöht" }; }
      if (eq > 0.3 || bluff) return { ...x, put: x.put + amount, last: "geht mit" };
      return { ...x, folded: true, last: "passt" };
    });
    return { st: out, raise };
  };

  const act = (kind: "check" | "bet" | "call" | "fold") => {
    let st = seats.map((x) => ({ ...x, last: undefined as string | undefined }));
    if (kind === "fold") {
      st[0].folded = true;
      setSeats(st); setStreet("show");
      setRes({ bet: myPut.current, payout: 0, text: "Du hast gepasst" }); settle("poker", myPut.current, 0);
      return;
    }
    if (kind === "call") {
      if (!placeBet(toCall)) return;
      myPut.current += toCall; st[0].put += toCall;
      // Bots, die vor der Erhöhung mitgegangen sind, gleichen aus
      st = st.map((x) => (x.bot && !x.folded && x.last !== "erhöht" && x.last !== "setzt" ? { ...x, put: x.put + toCall } : x));
      setSeats(st); say(`Du gehst mit (${toCall}).`); advance(st);
      return;
    }
    const amount = kind === "bet" ? unit.current : 0;
    if (amount && !placeBet(amount)) return;
    if (amount) { myPut.current += amount; st[0].put += amount; }
    const r = botsAct(st, amount);
    st = r.st;
    setSeats(st);
    say(st.filter((x) => x.bot).map((x) => `${x.name} ${x.last}`).join(" · "));
    if (r.raise) { setToCall(r.raise); return; } // du musst reagieren
    advance(st);
  };

  const me = seats[0];
  const myHand = me && board.length >= 3 ? handNames[evalHand([...me.hole, ...board]).cat] : null;
  const inHand = street && street !== "show";

  return (
    <GameShell id="poker" onBack={onBack} rules="Texas Hold’em gegen zwei Bots. Jeder zahlt den Einsatz als Ante. In jeder Runde kannst du schieben, setzen, mitgehen oder passen. Die beste Fünf-Karten-Hand aus deinen zwei und den fünf Gemeinschaftskarten gewinnt den Pot.">
      <div className="table poker">
        <div className="poker__bots">
          {seats.filter((x) => x.bot).map((x) => (
            <div key={x.name} className={`pseat ${x.folded ? "is-folded" : ""}`}>
              <span className="pseat__name">{x.name}{x.last ? ` · ${x.last}` : ""}</span>
              <div className="hand__cards">{x.hole.map((c, i) => <PlayingCard key={i} c={c} hidden={street !== "show" || x.folded} small />)}</div>
            </div>
          ))}
        </div>
        <div className="poker__board">
          <span className="poker__pot">Pot {pot}</span>
          <div className="hand__cards">{Array.from({ length: 5 }, (_, i) => <PlayingCard key={i} c={board[i]} hidden={!board[i]} small />)}</div>
          <span className="poker__street">{street ? streetName[street] : "Bereit"}</span>
        </div>
        {me && (
          <div className="hand">
            <span className="hand__label">Du {myHand ? `· ${myHand}` : ""}</span>
            <div className="hand__cards">{me.hole.map((c, i) => <PlayingCard key={i} c={c} />)}</div>
          </div>
        )}
        {s.settings.training && inHand && me && (
          <p className="coach">Trainer: Deine Gewinnchance liegt bei etwa <b>{Math.round(equity(me.hole, board, seats.filter((x) => x.bot && !x.folded).length, 300) * 100)} %</b>. Ab ~{Math.round(100 / (seats.filter((x) => !x.folded).length + 1))} % lohnt sich Mitgehen meist.</p>
        )}
        {log.length > 0 && <div className="poker__log">{log.map((l, i) => <span key={i}>{l}</span>)}</div>}
        {res && <Outcome bet={res.bet} payout={res.payout} text={res.text} />}
        {inHand ? (
          toCall > 0 ? (
            <div className="actions2">
              <Action tone="ghost" onClick={() => act("fold")}>Passen</Action>
              <Action onClick={() => act("call")}>Mitgehen · {toCall}</Action>
            </div>
          ) : (
            <div className="actions3">
              <Action tone="ghost" onClick={() => act("fold")}>Passen</Action>
              <Action tone="ghost" onClick={() => act("check")}>Schieben</Action>
              <Action onClick={() => act("bet")}>Setzen · {unit.current}</Action>
            </div>
          )
        ) : (
          <>
            <BetInput value={bet} onChange={setBet} label="Ante / Einsatzgröße" />
            <Action onClick={deal} disabled={done}>Neue Hand</Action>
          </>
        )}
      </div>
    </GameShell>
  );
}
