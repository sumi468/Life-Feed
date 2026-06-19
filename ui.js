// scripts/ui.js
// Small shared UI utilities: screen switching, toasts, bottom-nav state, modal helpers.
// Keeping this separate avoids duplicating DOM boilerplate across feature modules.

const toastEl = document.getElementById("toast");
let toastTimer = null;

/** Show a transient toast message (Japanese text expected). */
export function showToast(message, duration = 2200) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("toast--visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("toast--visible");
  }, duration);
}

/** Switch which top-level <section data-screen="..."> is visible. */
export function showScreen(screenId) {
  document.querySelectorAll("[data-screen]").forEach((el) => {
    el.classList.toggle("screen--active", el.dataset.screen === screenId);
  });
  document.querySelectorAll("[data-nav-target]").forEach((btn) => {
    btn.classList.toggle("nav-btn--active", btn.dataset.navTarget === screenId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Open a modal by id with a simple fade/scale transition. */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("modal--open");
  document.body.classList.add("body--modal-open");
}

/** Close a modal by id. */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("modal--open");
  document.body.classList.remove("body--modal-open");
}

/** Format minutes as "1時間20分" style Japanese duration string. */
export function formatDurationJP(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0分";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

/** Format a Firestore Timestamp / Date into "HH:MM" */
export function formatTimeJP(date) {
  const d = date instanceof Date ? date : date.toDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Simple element creation helper to avoid innerHTML soup in feature modules. */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Generate a 6-character uppercase invite code. */
export function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Show the full-screen loading overlay. */
export function showLoading() {
  document.getElementById("loadingScreen")?.classList.add("loading-screen--visible");
}

/** Hide the full-screen loading overlay. */
export function hideLoading() {
  document.getElementById("loadingScreen")?.classList.remove("loading-screen--visible");
}

/**
 * Lightweight confirm dialog using the support/log modal pattern.
 * Returns a Promise<boolean> resolved by the user's choice.
 */
export function confirmAction(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmModal");
    const text = document.getElementById("confirmMessage");
    const okBtn = document.getElementById("confirmOkBtn");
    const cancelBtn = document.getElementById("confirmCancelBtn");
    if (!modal || !text || !okBtn || !cancelBtn) {
      resolve(window.confirm(message));
      return;
    }
    text.textContent = message;
    openModal("confirmModal");

    const cleanup = (result) => {
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      closeModal("confirmModal");
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  });
}

/** Wire up generic [data-close-modal] and [data-nav-target] buttons once at startup. */
export function bindGlobalUI() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("modal--open");
    });
  });
}
