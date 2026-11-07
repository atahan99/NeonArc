import { print, setScreen, span, moveCursor } from "../term.js";

export const SIZE = 8, MINES = 10;
const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

/** Mines placed anywhere except the first-clicked cell and its neighbours, so the first click opens an area. */
export function placeMines(safeR, safeC, rnd = Math.random) {
  const cells = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (Math.abs(r - safeR) > 1 || Math.abs(c - safeC) > 1) cells.push(r * SIZE + c);
  const mine = new Array(SIZE * SIZE).fill(false);
  for (let k = 0; k < MINES; k++) {
    const j = k + ((rnd() * (cells.length - k)) | 0); // partial Fisher-Yates
    [cells[k], cells[j]] = [cells[j], cells[k]];
    mine[cells[k]] = true;
  }
  return mine;
}

export function countAdjacent(mine) {
  return mine.map((_, i) => {
    const r = (i / SIZE) | 0, c = i % SIZE;
    let n = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if ((dr || dc) && inBounds(r + dr, c + dc) && mine[(r + dr) * SIZE + c + dc]) n++;
    return n;
  });
}

/** Reveal from (r, c), spreading through zero cells. Mutates `revealed`, returns cells opened. */
export function flood(r, c, { mine, adj, revealed, flagged }) {
  const stack = [[r, c]];
  let opened = 0;
  while (stack.length) {
    const [rr, cc] = stack.pop();
    const i = rr * SIZE + cc;
    if (!inBounds(rr, cc) || revealed[i] || flagged[i]) continue;
    revealed[i] = true;
    opened++;
    if (adj[i] === 0 && !mine[i])
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (dr || dc) stack.push([rr + dr, cc + dc]);
  }
  return opened;
}

let field, cursor, started, over, won, remaining, flagCount;

function reset() {
  const empty = () => new Array(SIZE * SIZE).fill(false);
  field = { mine: empty(), adj: new Array(SIZE * SIZE).fill(0), revealed: empty(), flagged: empty() };
  cursor = { r: 0, c: 0 };
  started = over = won = false;
  remaining = SIZE * SIZE - MINES;
  flagCount = 0;
}

function reveal() {
  const i = cursor.r * SIZE + cursor.c;
  if (over || field.flagged[i] || field.revealed[i]) return;
  if (!started) {
    field.mine = placeMines(cursor.r, cursor.c);
    field.adj = countAdjacent(field.mine);
    started = true;
  }
  if (field.mine[i]) {
    field.revealed[i] = true;
    over = true;
    render();
    print("BOOM! You hit a mine. Game over.", "bad");
    print("Type restart to try again, or quit for the menu.", "dim");
    return;
  }
  remaining -= flood(cursor.r, cursor.c, field);
  if (remaining <= 0) {
    won = over = true;
    print("CLEARED! All safe cells revealed. You win!", "warn");
  }
  render();
}

function toggleFlag() {
  const i = cursor.r * SIZE + cursor.c;
  if (over || field.revealed[i]) return;
  field.flagged[i] = !field.flagged[i];
  flagCount += field.flagged[i] ? 1 : -1;
  render();
}

const NUM = { 1: "hi", 2: "lime", 3: "warn", 4: "orange", 5: "bad", 6: "alt", 7: "soft", 8: "white" };

function render() {
  const edge = "   +" + "---".repeat(SIZE) + "+\n";
  let out = "    " + Array.from({ length: SIZE }, (_, c) => ` ${c + 1} `).join("") + "\n" + edge;
  for (let r = 0; r < SIZE; r++) {
    let line = ` ${r + 1} |`;
    for (let c = 0; c < SIZE; c++) {
      const i = r * SIZE + c, n = field.adj[i];
      let ch, cls;
      if (over && field.mine[i]) [ch, cls] = ["*", "bad"];
      else if (field.flagged[i]) [ch, cls] = ["F", "warn"];
      else if (!field.revealed[i]) [ch, cls] = [".", "dim"];
      else if (n === 0) [ch, cls] = [" ", null];
      else [ch, cls] = [String(n), NUM[n]];
      if (r === cursor.r && c === cursor.c) line += span("[" + ch + "]", "hi");
      else line += " " + (cls ? span(ch, cls) : ch) + " ";
    }
    out += line + "|\n";
  }
  out += edge;
  out += `\nMines: ${MINES}   Flags: ${flagCount}\n`;
  out += `${span("[x]", "hi")} cursor  ${span(".", "dim")} hidden  ${span("F", "warn")} flag  ${span("*", "bad")} mine\n`;
  if (won) out += "\n  >> YOU WIN <<\n";
  else if (over) out += "\n  >> GAME OVER <<\n";
  setScreen(out);
}

export default {
  name: "Minesweeper",
  description: "Clear the field, avoid mines.",
  start() {
    reset();
    render();
    print("MINESWEEPER // reveal all safe cells. 10 mines hidden.", "hi");
    print("Controls: Arrows/WASD = move | Enter/Space = reveal | F = flag | / = type a command", "dim");
    print("Touch: tap = reveal, long-press = flag", "dim");
  },
  restart() {
    reset();
    render();
    print("Minesweeper restarted.", "alt");
  },
  handleKey(e) {
    if (moveCursor(e, cursor, SIZE, SIZE)) { render(); return true; }
    if (e.key === "Enter" || e.key === " ") { reveal(); return true; }
    if (e.key.toLowerCase() === "f") { toggleFlag(); return true; }
    return false;
  },
  cellAt(line, col) {
    const r = line - 2, c = Math.floor((col - 4) / 3);
    return inBounds(r, c) ? { r, c } : null;
  },
  cursorAt: () => cursor,
  touch: { tap: " ", hold: "f" },
  statusText: () => `FLAGS: ${flagCount}/${MINES}`,
};
