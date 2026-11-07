import { print, setScreen, span, center, gameTimer, reducedMotion } from "../term.js";

const W = 46, MS = 90;
const TRAIN = [
  "      ====        ____",
  "  ___|[]|_______|    |___",
  " |___________________|__|]",
  " |   NEONARC  o   o     ||",
  " |_____________________ ||",
  "   (O)==(O)     (O)==(O) ",
];
const TW = Math.max(...TRAIN.map((l) => l.length));
let offset, gone;
const tick = gameTimer();

function render() {
  let out = "";
  for (const line of TRAIN) {
    const buf = new Array(W).fill(" ");
    for (let i = 0; i < line.length; i++) if (offset + i >= 0 && offset + i < W) buf[offset + i] = line[i];
    out += span(buf.join(""), "warn") + "\n";
  }
  out += "\n";
  if (gone) out += center("The train has departed.", W) + "\n" + center("Type restart to run it again.", W) + "\n";
  setScreen(out);
}

function step() {
  offset--;
  if (offset < -TW) { gone = true; tick.stop(); }
  render();
}

function begin() {
  gone = false;
  if (reducedMotion()) {
    offset = (W - TW) >> 1;
    print("Reduced motion is on, so the train waits at the station.", "dim");
  } else {
    offset = W;
    tick.start(step, MS);
  }
  render();
}

export default {
  name: "sl",
  description: "A steam locomotive rolls by.",
  kind: "tool",
  start() {
    begin();
    print("sl // steam locomotive incoming. All aboard!", "hi");
    print("Controls: watch it roll | restart | quit", "dim");
  },
  stop() { tick.stop(); },
  restart() {
    tick.stop();
    begin();
    print("sl restarted.", "alt");
  },
};
