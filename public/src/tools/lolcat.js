import { print, setScreen, span, gameTimer, reducedMotion } from "../term.js";

const MS = 110;
const DEFAULT = ["NEONARC", "rainbow terminal filter", "type any text to colorize it"];
let text, offset;
const tick = gameTimer();

function render() {
  let out = "", i = 0;
  const hues = [];
  for (const line of text) {
    for (const ch of line) {
      if (ch === " ") out += " ";
      else {
        out += span(ch, "lc");
        hues.push((i * 12 + offset) % 360);
      }
      i++;
    }
    out += "\n";
    i += 6;
  }
  setScreen(out);
  // Colours go through the CSSOM, which the Content-Security-Policy allows (inline style="" it does not).
  document.querySelectorAll("#screen .lc").forEach((el, k) => { el.style.color = `hsl(${hues[k]} 100% 65%)`; });
}

function begin() {
  text = DEFAULT;
  offset = 0;
  render();
  if (!reducedMotion()) tick.start(() => { offset = (offset + 12) % 360; render(); }, MS);
}

export default {
  name: "lolcat",
  description: "Rainbow-colored text.",
  kind: "tool",
  start() {
    begin();
    print("lolcat // everything is better in rainbow.", "hi");
    print("Controls: type text = colorize it | restart | quit", "dim");
  },
  stop() { tick.stop(); },
  restart() {
    tick.stop();
    begin();
    print("lolcat reset.", "alt");
  },
  handleCommand(cmd) {
    if (!cmd) return false;
    text = [cmd];
    render();
    return true;
  },
};
