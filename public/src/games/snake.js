import { print, setScreen, span, load, endScoreGame, gameTimer } from "../term.js";

export const W = 24, H = 15;
const TICK = 130, BEST_KEY = "neonarc.snake.best";
const DIRS = {
  ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
};

/** A random cell the snake doesn't cover, or null when it fills the board. */
export function freeCell(body, rnd = Math.random) {
  const free = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (!body.some((s) => s.x === x && s.y === y)) free.push({ x, y });
  return free.length ? free[(rnd() * free.length) | 0] : null;
}

/** Queue a turn (at most two ahead, so fast corners aren't lost) unless it repeats or reverses. */
export function queueTurn(queue, dir, turn) {
  const last = queue.at(-1) || dir;
  const same = turn.x === last.x && turn.y === last.y;
  const back = turn.x === -last.x && turn.y === -last.y;
  if (queue.length < 2 && !same && !back) queue.push(turn);
  return queue;
}

let body, dir, queue, food, score, best, over;
const tick = gameTimer();

function reset() {
  body = [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }];
  dir = { x: 1, y: 0 };
  queue = [];
  food = freeCell(body);
  score = 0;
  over = false;
  best = load(BEST_KEY, 0);
}

function step() {
  if (queue.length) dir = queue.shift();
  const head = { x: body[0].x + dir.x, y: body[0].y + dir.y };
  const hit = head.x < 0 || head.x >= W || head.y < 0 || head.y >= H ||
    body.some((s) => s.x === head.x && s.y === head.y);
  if (hit) return end();
  body.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    food = freeCell(body);
    if (!food) return end("You filled the whole board!");
  } else {
    body.pop();
  }
  render();
}

function end(win) {
  over = true;
  tick.stop();
  if (win) print(win, "warn");
  best = endScoreGame("Snake", score, best, BEST_KEY);
  render();
}

const GLYPH = { "@": "hi", o: "soft", "*": "warn" };
const glyph = (ch) => (GLYPH[ch] ? span(ch, GLYPH[ch]) : ch);

function render() {
  const grid = Array.from({ length: H }, () => new Array(W).fill(" "));
  if (food) grid[food.y][food.x] = "*";
  body.forEach((s, i) => { grid[s.y][s.x] = i ? "o" : "@"; });
  const edge = "+" + "-".repeat(W) + "+";
  let out = edge + "\n" + grid.map((row) => "|" + row.map(glyph).join("") + "|").join("\n") + "\n" + edge + "\n";
  out += `\nScore: ${score}   Best: ${Math.max(best, score)}\n`;
  out += `${glyph("@")} head  ${glyph("o")} body  ${glyph("*")} food\n`;
  if (over) out += "\n  >> GAME OVER <<\n";
  setScreen(out);
}

function begin() {
  reset();
  render();
  tick.start(step, TICK);
}

export default {
  name: "Snake",
  description: "Classic neon snake.",
  start() {
    begin();
    print("SNAKE // eat the * to grow. Don't hit walls or yourself.", "hi");
    print("Controls: Arrow keys / WASD or swipe = move | / = type a command", "dim");
  },
  stop() { tick.stop(); },
  restart() {
    tick.stop();
    begin();
    print("Snake restarted.", "alt");
  },
  handleKey(e) {
    const d = DIRS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!d) return false;
    if (!over) queueTurn(queue, dir, { x: d[0], y: d[1] });
    return true;
  },
  touch: { swipe: "once" },
  statusText: () => `SCORE: ${score} | BEST: ${Math.max(best, score)}`,
};
