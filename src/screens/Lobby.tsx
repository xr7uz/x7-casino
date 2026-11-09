import { useState } from "react";
import { LuGift, LuStar, LuArrowRight, LuSearch } from "react-icons/lu";
import { useStore } from "../store";
import { games } from "../games/registry";
import { tap } from "../lib/haptics";
import { play } from "../lib/sound";

export function Lobby({ open }: { open: (id: string) => void }) {
  const { s, player, fmt, edge, bonusReady, claimBonus } = useStore();
  const [q, setQ] = useState("");
  const [bonus, setBonus] = useState<number | null>(null);
  const rtp = player.wagered ? (player.returned / player.wagered) * 100 : 0;
  const list = games.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()));
  const favs = list.filter((g) => s.favorites.includes(g.id));
  const rest = list.filter((g) => !s.favorites.includes(g.id));

  return (
    <div className="screen lobby">
      <section className="hero">
        <p className="hero__kick">X7 Casino · Spielgeld</p>
        <h1 className="hero__title">16 Spiele.<br /><span>Null Risiko.</span></h1>
        <div className="kpis">
          <div><span>Runden</span><b>{player.rounds}</b></div>
          <div><span>Eingesetzt</span><b>{fmt(player.wagered)}</b></div>
          <div><span>Dein RTP</span><b>{player.wagered ? `${rtp.toFixed(1)} %` : "–"}</b></div>
        </div>
      </section>

      {bonusReady && (
        <button className="bonus" onClick={() => { tap("medium"); play("bigwin"); setBonus(claimBonus()); }}>
          <LuGift /> <span><b>Täglicher Bonus</b><small>Gratis-Credits abholen</small></span><LuArrowRight />
        </button>
      )}
      {bonus !== null && <p className="bonus__got" role="status">+{fmt(bonus)} gutgeschrieben</p>}

      <label className="search">
        <LuSearch aria-hidden="true" />
        <span className="sr-only">Spiel suchen</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Spiel suchen" />
      </label>

      {favs.length > 0 && <h2 className="sec">Favoriten</h2>}
      {favs.length > 0 && <Grid items={favs} open={open} />}
      <h2 className="sec">Alle Spiele</h2>
      <Grid items={rest} open={open} />
      <p className="lobby__note">Hausvorteil der mathematischen Spiele: {(edge * 100).toFixed(1)} % – änderbar in den Einstellungen.</p>
    </div>
  );
}

/** Spielkacheln – eigene Komponente, damit sie bei Guthaben-Änderungen nicht neu einfliegen */
function Grid({ items, open }: { items: typeof games; open: (id: string) => void }) {
  const { s, edge, toggleFav } = useStore();
  return (
    <div className="ggrid">
      {items.map((g) => {
        const Icon = g.icon;
        const fav = s.favorites.includes(g.id);
        return (
          <div key={g.id} className="gcard" style={{ ["--g" as string]: g.hue }}>
            <button className="gcard__main" onClick={() => { tap(); open(g.id); }} aria-label={`${g.name} öffnen`}>
              <span className="gcard__icon"><Icon /></span>
              <span className="gcard__name">{g.name}</span>
              <span className="gcard__desc">{g.desc}</span>
              <span className="gcard__meta">{g.edgeLabel(edge)}<LuArrowRight /></span>
            </button>
            <button className={`gcard__fav ${fav ? "is-on" : ""}`} onClick={() => { play("chip"); toggleFav(g.id); }} aria-label={fav ? "Favorit entfernen" : "Als Favorit"}><LuStar /></button>
          </div>
        );
      })}
    </div>
  );
}
