import { print, setScreen, span, center } from "../term.js";

/** Why a move is illegal, or null when it is allowed. Towers are 0-based stacks, top last. */
export function moveError(towers, from, to) {
  if (from === to) return "Source and destination are the same.";
  if (!towers[from].length) return `Tower ${from + 1} is empty.`;
  const disk = towers[from].at(-1), top = towers[to].at(-1);
  if (top && disk > top) return `Cannot place disk ${disk} on smaller disk ${top}.`;
  return null;
}

const COLOR = { 1: "hi", 2: "lime", 3: "warn", 4: "orange", 5: "bad", 6: "alt", 7: "soft" };
let towers, disks, moves, won;

function reset(n) {
  disks = n;
  towers = [Array.from({ length: n }, (_, i) => n - i), [], []];
  moves = 0;
  won = false;
}

function diskCell(disk, width) {
  if (!disk) return center("|", width);
  const piece = "=".repeat(2 * disk - 1);
  const left = Math.floor((width - piece.length) / 2);
  return " ".repeat(left) + span(piece, COLOR[disk]) + " ".repeat(width - piece.length - left);
}

function render() {
  const width = 2 * disks + 1;
  let out = "";
  for (let level = disks - 1; level >= 0; level--)
    out += towers.map((t) => diskCell(t[level], width) + "  ").join("") + "\n";
  out += [0, 1, 2].map(() => "-".repeat(width) + "  ").join("") + "\n";
  out += [1, 2, 3].map((n) => center(`(${n})`, width) + "  ").join("") + "\n";
  out += `\nDisks: ${disks}   Moves: ${moves}   Best possible: ${2 ** disks - 1}\n`;
  out += 'Move all disks to tower 3. Type e.g. "1 3".\n';
  if (won) out += `\n  >> SOLVED in ${moves} moves! <<\n`;
  setScreen(out);
}

function move(from, to) {
  if (won) return print("Already solved. Type restart or quit.", "dim");
  const err = moveError(towers, from, to);
  if (err) return print(err, "bad");
  towers[to].push(towers[from].pop());
  moves++;
  won = towers[2].length === disks;
  render();
  if (won) print(`SOLVED! Tower of Hanoi in ${moves} moves${moves === 2 ** disks - 1 ? " (perfect)" : ""}.`, "warn");
}

export default {
  name: "Tower of Hanoi",
  description: "Move the stack, one disk at a time.",
  start() {
    reset(3);
    render();
    print("TOWER OF HANOI // move the whole stack to tower 3.", "hi");
    print('Controls: type "1 3" to move the top disk from tower 1 to 3 | restart 5 = five disks', "dim");
  },
  restart(arg) {
    const n = parseInt(arg, 10);
    reset(Math.max(3, Math.min(7, Number.isNaN(n) ? disks : n)));
    render();
    print(`Tower of Hanoi restarted with ${disks} disks.`, "alt");
  },
  handleCommand(cmd) {
    const m = cmd.match(/^\s*([1-3])\s+([1-3])\s*$/);
    if (m) { move(Number(m[1]) - 1, Number(m[2]) - 1); return true; }
    if (/^[0-9\s]+$/.test(cmd)) { print('Invalid move. Use two towers, e.g. "1 3".', "warn"); return true; }
    return false;
  },
  statusText: () => `MOVES: ${moves} | DISKS: ${disks}`,
};
