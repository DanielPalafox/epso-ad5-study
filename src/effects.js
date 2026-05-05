// Transient UI effects: toast, confetti.

const CONFETTI_COLORS = ["var(--gold)", "var(--accent)", "var(--primary)", "var(--correct)", "#f4e04d"];
const CONFETTI_PIECES = 40;
const CONFETTI_LIFETIME_MS = 1800;
const TOAST_LIFETIME_MS = 2200;

export function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), TOAST_LIFETIME_MS);
}

/** Crown-upgrade celebration. Pure CSS particle burst — no canvas dependency. */
export function showConfetti() {
  // Honour the user's motion preference — vestibular safety > delight
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const container = document.createElement("div");
  container.className = "confetti-burst";
  for (let i = 0; i < CONFETTI_PIECES; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.cssText =
      "left:" + (10 + Math.random() * 80) + "%" +
      ";background:" + CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] +
      ";animation-delay:" + (Math.random() * 0.4) + "s" +
      ";animation-duration:" + (0.8 + Math.random() * 0.6) + "s" +
      ";width:" + (6 + Math.random() * 6) + "px" +
      ";height:" + (6 + Math.random() * 6) + "px" +
      ";border-radius:" + (Math.random() > 0.5 ? "50%" : "2px");
    container.appendChild(p);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), CONFETTI_LIFETIME_MS);
}
