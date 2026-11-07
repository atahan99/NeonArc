import { print, setScreen, span, gameTimer, reducedMotion } from "../term.js";

const W = 34, H = 20, MS = 70;
const COLORS = ["hi", "alt", "soft", "fg", "warn", "bad", "blue"];
// corner glyph for "was heading <from>, now heading <to>" (0 up, 1 right, 2 down, 3 left)
const TURN = {
  "0,1": "┌", "0,3": "┐", "2,1": "└", "2,3": "┘",
  "1,0": "┘", "1,2": "┐", "3,0": "└", "3,2": "┌",
};
const pick = () => COLORS[(Math.random() * COLORS.length) | 0];

let ch, cls, x, y, dir, color, filled;
const tick = gameTimer();

function reset() {
  ch = Array.from({ length: H }, () => new Array(W).fill(" "));
  cls = Array.from({ length: H }, () => new Array(W).fill(null));
  x = W >> 1; y = H >> 1;
  dir = (Math.random() * 4) | 0;
  color = pick();
  filled = 0;
}

function step() {
  let turn = dir;
  if (Math.random() < 0.12) turn = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
  if (ch[y][x] === " ") filled++;
  ch[y][x] = turn === dir ? (dir % 2 ? "─" : "│") : TURN[dir + "," + turn];
  cls[y][x] = color;
  dir = turn;
  x += dir === 1 ? 1 : dir === 3 ? -1 : 0;
  y += dir === 2 ? 1 : dir === 0 ? -1 : 0;
  if (x < 0 || x >= W || y < 0 || y >= H) {
    x = (x + W) % W;
    y = (y + H) % H;
    color = pick();
  }
  if (filled > W * H * 0.7) reset();
}

function render() {
  setScreen(ch.map((row, r) => row.map((c, i) => (c === " " ? " " : span(c, cls[r][i]))).join("")).join("\n") + "\n");
}

function begin() {
  reset();
  if (reducedMotion()) {
    for (let i = 0; i < 300; i++) step(); // one finished still frame
    print("Reduced motion is on, so the pipes hold still.", "dim");
  } else {
    tick.start(() => { step(); render(); }, MS);
  }
  render();
}

export default {
  name: "pipes",
  description: "Neon pipes screensaver.",
  kind: "tool",
  start() {
    begin();
    print("pipes // neon conduits snaking across the deck.", "hi");
    print("Controls: just watch | restart | quit", "dim");
  },
  stop() { tick.stop(); },
  restart() {
    tick.stop();
    begin();
    print("pipes restarted.", "alt");
  },
};
