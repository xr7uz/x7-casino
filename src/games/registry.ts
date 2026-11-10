import type { IconType } from "react-icons";
import { LuCastle, LuCoins, LuGauge, LuLayers, LuFlag, LuChartLine, LuSpade, LuClub, LuGem, LuTarget, LuCircleDot, LuFish, LuArrowUpDown, LuDiamond, LuGrid3X3, LuLoaderPinwheel, LuBird, LuDices, LuCherry, LuSwords, LuPackageOpen } from "react-icons/lu";

export type GameMeta = {
  id: string;
  name: string;
  desc: string;
  icon: IconType;
  hue: string;
  edgeLabel: (edge: number) => string;
  party: boolean;
};

const math = (e: number) => (e < 0 ? `${(-e * 100).toFixed(1).replace(".0", "")} % Spielervorteil` : e === 0 ? "Fair · 0 %" : `${(e * 100).toFixed(1).replace(".0", "")} % Bank`);
/** Spiele, deren Quote über den Hausvorteil einstellbar ist */
export const tunable = ["tower", "coinflip", "limbo", "race", "crash", "mines", "plinko", "fish", "hilo", "keno", "wheel", "chicken", "dice", "slots", "loot"];

export const games: GameMeta[] = [
  { id: "crash", name: "Crash", desc: "Steig aus, bevor es platzt.", icon: LuChartLine, hue: "#ff69b4", edgeLabel: math, party: true },
  { id: "blackjack", name: "Blackjack", desc: "Schlag den Dealer auf dem Weg zur 21.", icon: LuSpade, hue: "#ff4d6d", edgeLabel: () => "Zahlt 3:2", party: true },
  { id: "poker", name: "Poker", desc: "Texas Hold’em gegen zwei Bots.", icon: LuClub, hue: "#b48cff", edgeLabel: () => "gegen Bots", party: false },
  { id: "mines", name: "Mines", desc: "Sammle Edelsteine, meide Minen.", icon: LuGem, hue: "#ffd166", edgeLabel: math, party: true },
  { id: "roulette", name: "Roulette", desc: "Rot, Schwarz oder die Zahl selbst.", icon: LuTarget, hue: "#7ee08a", edgeLabel: () => "2,7 % Bank", party: true },
  { id: "plinko", name: "Pinball", desc: "Lass die Kugel fallen, nimm das Fach.", icon: LuCircleDot, hue: "#ff6b9a", edgeLabel: math, party: true },
  { id: "fish", name: "Fischjagd", desc: "Richte die Kanone aus. Größerer Fisch, größerer Fang.", icon: LuFish, hue: "#5ec2ff", edgeLabel: math, party: true },
  { id: "hilo", name: "Hi-Lo", desc: "Höher oder niedriger? Reite die Serie.", icon: LuArrowUpDown, hue: "#7aa7ff", edgeLabel: math, party: true },
  { id: "baccarat", name: "Baccara", desc: "Spieler oder Bank – wer näher an neun ist.", icon: LuDiamond, hue: "#e05577", edgeLabel: () => "1,1 % Bank", party: true },
  { id: "keno", name: "Keno", desc: "Wähle Zahlen. Zehn werden gezogen.", icon: LuGrid3X3, hue: "#46d39a", edgeLabel: math, party: true },
  { id: "wheel", name: "Glücksrad", desc: "Dreh es. Wo es stoppt, wird gezahlt.", icon: LuLoaderPinwheel, hue: "#ffc145", edgeLabel: math, party: true },
  { id: "chicken", name: "Chicken", desc: "Über die Straße – lass dich nicht platt machen.", icon: LuBird, hue: "#ffa24c", edgeLabel: math, party: true },
  { id: "dice", name: "Würfel", desc: "Sag an: darüber oder darunter.", icon: LuDices, hue: "#4ea8ff", edgeLabel: math, party: true },
  { id: "slots", name: "Slots", desc: "Drei Walzen, eine Gewinnlinie.", icon: LuCherry, hue: "#ffb02e", edgeLabel: math, party: true },
  { id: "dragontiger", name: "Dragon Tiger", desc: "Eine Karte je Seite. Die höhere gewinnt.", icon: LuSwords, hue: "#ff5a3c", edgeLabel: () => "3,7 % Bank", party: true },
  { id: "tower", name: "Tower", desc: "Klettere hoch, meide die Fallen.", icon: LuCastle, hue: "#ff8fab", edgeLabel: math, party: true },
  { id: "coinflip", name: "Münzwurf", desc: "Kopf oder Zahl – Serie verdoppelt.", icon: LuCoins, hue: "#ffd166", edgeLabel: math, party: true },
  { id: "limbo", name: "Limbo", desc: "Wähle ein Ziel und hoffe, dass es reicht.", icon: LuGauge, hue: "#5ec2ff", edgeLabel: math, party: true },
  { id: "videopoker", name: "Video Poker", desc: "Jacks or Better: halten, ziehen, gewinnen.", icon: LuLayers, hue: "#b48cff", edgeLabel: () => "Zahlt 9/6", party: true },
  { id: "race", name: "Pferderennen", desc: "Sechs Pferde, eine Ziellinie.", icon: LuFlag, hue: "#7ee08a", edgeLabel: math, party: true },
  { id: "loot", name: "Loot-Boxen", desc: "Öffne eine Box, bete um die Uhr.", icon: LuPackageOpen, hue: "#c77dff", edgeLabel: math, party: true },
];
export const gameById = (id: string) => games.find((g) => g.id === id)!;
