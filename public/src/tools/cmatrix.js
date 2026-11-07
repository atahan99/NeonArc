import { print, setScreen, span, gameTimer, reducedMotion } from "../term.js";

const W = 34, H = 20, TRAIL = 9, MS = 90;
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=<>";
const rnd = () => CHARS[(Math.random() * CHARS.length) | 0];
const shade = (k) => (k === 0 ? "mx0" : k === 1 ? "mx1" : k <= 3 ? "mx2" : k <= 5 ? "mx3" : "mx4");

let chars, drops;
const tick = gameTimer();

function reset(spread) {
  chars = Array.from({ length: H }, () => Array.from({ length: W }, rnd));
  // spread: a still frame with drops already part-way down (reduced motion)
  drops = Array.from({ length: W }, () => (spread ? (Math.random() * (H + TRAIL)) | 0 : -((Math.random() * H * 2) | 0)));
}

function render() {
  const grid = Array.from({ length: H }, () => new Array(W).fill(" "));
  drops.forEach((head, c) => {
    for (let k = 0; k < TRAIL; k++) {
      const y = head - k;
      if (y >= 0 && y < H) grid[y][c] = span(chars[y][c], shade(k));
    }
  });
  setScreen(grid.map((row) => row.join("")).join("\n") + "\n");
}

function step() {
  for (let i = 0; i < 6; i++) chars[(Math.random() * H) | 0][(Math.random() * W) | 0] = rnd();
  drops = drops.map((d) => (d + 1 - TRAIL > H && Math.random() < 0.06 ? -((Math.random() * H) | 0) : d + 1));
  render();
}

function begin() {
  const still = reducedMotion();
  reset(still);
  render();
  if (still) print("Reduced motion is on, so the rain holds still.", "dim");
  else tick.start(step, MS);
}

export default {
  name: "cmatrix",
  description: "Falling neon code rain.",
  kind: "tool",
  start() {
    begin();
    print("cmatrix // the neon rain falls. There is no spoon.", "hi");
    print("Controls: just watch | restart | quit", "dim");
  },
  stop() { tick.stop(); },
  restart() {
    tick.stop();
    begin();
    print("cmatrix restarted.", "alt");
  },
};
