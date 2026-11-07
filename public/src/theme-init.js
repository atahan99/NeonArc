// Runs in <head> before first paint, so a saved theme never flashes the default one.
try {
  const t = localStorage.getItem("neonarc.theme");
  if (t) document.documentElement.dataset.theme = t;
} catch { /* storage blocked: default theme */ }
