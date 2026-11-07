import { print, setScreen, span } from "../term.js";

const COW = [
  "        \\   ^__^",
  "         \\  (oo)\\_______",
  "            (__)\\       )\\/\\",
  "                ||----w |",
  "                ||     ||",
].join("\n");

/** Greedy word wrap. Words longer than the width stay on their own line. */
export function wrap(text, width) {
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= width) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

let message;

function render() {
  const lines = wrap(message, 38);
  const max = Math.max(...lines.map((l) => l.length));
  let out = " " + "_".repeat(max + 2) + "\n";
  lines.forEach((l, j) => {
    const [a, b] = lines.length === 1 ? ["<", ">"] : j === 0 ? ["/", "\\"] : j === lines.length - 1 ? ["\\", "/"] : ["|", "|"];
    out += a + " " + span(l.padEnd(max), "hi") + " " + b + "\n";
  });
  out += " " + "-".repeat(max + 2) + "\n";
  setScreen(out + span(COW, "alt") + "\n");
}

export default {
  name: "cowsay",
  description: "A neon cow says your words.",
  kind: "tool",
  start() {
    message = "Welcome to NEONARC. Type anything and I will say it.";
    render();
    print("cowsay // type any text and press Enter to make the cow speak.", "hi");
    print("Controls: type text = say it | restart | quit", "dim");
  },
  restart() {
    message = "Moo. Ready for a new message.";
    render();
    print("cowsay reset.", "alt");
  },
  handleCommand(cmd) {
    if (!cmd) return false;
    message = cmd;
    render();
    return true;
  },
};
