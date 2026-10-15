/** A native 24 × 20 pixel sprite, kept crisp at every screen size. */
const pixels = [
  "........................",
  "........oooooooo........",
  "......ooaaaaaaaaoo......",
  "....ooaaayaaaayaaaoo....",
  "...oaayaaaaayaaaaaao...",
  "..oaaaaaayaaaaaayaaaao..",
  "..oaaaaaaaaaaaaaaaaaao..",
  ".oooooooooooooooooooooo.",
  ".ggggGggggggGggggggGggg.",
  "..GggggGGggggggGGggggG..",
  "..rrrrrrrrrrrrrrrrrrrr..",
  ".rrrrRRrrrrRRrrrrRRrrrr.",
  "..yyyyyyyyyyyyyyyyyyyy..",
  ".bbbbbyyyyybbbbbyyyybbb.",
  ".bbBbbbyyybbBbbbyybbBbb.",
  "..bbbbbbbbbbbbbbbbbbbb..",
  "..oaaaaaaaaaaaaaaaaaao..",
  "...oaaaaaaaaaaaaaaaao...",
  "....oooooooooooooooo....",
  "........................",
];
const colors: Record<string, string> = { o: "#b85b25", a: "#f1a744", y: "#ffe18c", g: "#85ae45", G: "#b6d560", r: "#df4b38", R: "#ff7052", b: "#693326", B: "#985034" };

export function PixelBurger() {
  return <svg className="pixel-burger" viewBox="0 0 24 20" role="img" aria-label="Hamburguesa ilustrada en pixel art" shapeRendering="crispEdges">{pixels.flatMap((row, y) => [...row].map((pixel, x) => pixel === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={colors[pixel]} />))}</svg>;
}
