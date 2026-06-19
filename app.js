// scripts/app.js
// Application entry point. Wires together auth state, screen routing,
// and initializes feature modules (feed, log, dashboard, streak, support).

import { onAuthReady, signUp, logIn, logOut, createFamily, joinFamilyByCode, AVATAR_ICONS } from "./auth.js";
import { startFeedListener, stopFeedListener } from "./feed.js";
import { initQuickLog } from "./log.js";
import { renderDashboard } from "./dashboard.js";
import { renderStreaks } from "./streak.js";
import { initSupport, stopSupportListener } from "./support.js";
import { showScreen, showToast, bindGlobalUI, openModal, closeModal, el } from "./ui.js";

let selectedAvatar = AVATAR_ICONS[0];
let quickLogInitialized = false;

/* ---------------- Auth screen wiring ---------------- */

function renderAvatarPicker() {
  const picker = document.getElementById("avatarPicker");
  if (!picker) return;
  picker.innerHTML = "";
  AVATAR_ICONS.forEach((icon) => {
    const btn = el("button", "avatar-option" + (icon === selectedAvatar ? " avatar-option--selected" : ""), icon);
    btn.addEventListener("click", () => {
      selectedAvatar = icon;
      document.querySelectorAll(".avatar-option").forEach((b) => b.classList.remove("avatar-option--selected"));
      btn.classList.add("avatar-option--selected");
    });
    picker.appendChild(btn);
  });
}

function bindAuthForms() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const toSignup = document.getElementById("showSignupBtn");
  const toLogin = document.getElementById("showLoginBtn");

  toSignup?.addEventListener("click", () => {
    document.getElementById("loginPanel").classList.add("hidden");
    document.getElementById("signupPanel").classList.remove("hidden");
  });
  toLogin?.addEventListener("click", () => {
    document.getElementById("signupPanel").classList.add("hidden");
    document.getElementById("loginPanel").classList.remove("hidden");
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    try {
      await logIn(email, password);
    } catch (err) {
      showToast("ログインに失敗しました");
      console.error(err);
    }
  });

  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const name = document.getElementById("signupName").value;
    try {
      await signUp(email, password, name, selectedAvatar);
    } catch (err) {
      showToast("登録に失敗しました");
      console.error(err);
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    stopFeedListener();
    stopSupportListener();
    await logOut();
  });
}

/* ---------------- Family onboarding wiring ---------------- */

function bindFamilyForms() {
  const createForm = document.getElementById("createFamilyForm");
  const joinForm = document.getElementById("joinFamilyForm");

  createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("familyNameInput").value;
    try {
      const { inviteCode } = await createFamily(name);
      showToast(`家族を作成しました（招待コード: ${inviteCode}）`);
      await enterMainApp();
    } catch (err) {
      showToast("作成に失敗しました");
      console.error(err);
    }
  });

  joinForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("inviteCodeInput").value;
    try {
      await joinFamilyByCode(code);
      showToast("家族に参加しました");
      await enterMainApp();
    } catch (err) {
      showToast(err.message || "参加に失敗しました");
      console.error(err);
    }
  });
}

/* ---------------- Bottom nav wiring ---------------- */

function bindBottomNav() {
  document.querySelectorAll("[data-nav-target]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.dataset.navTarget;
      showScreen(target);
      if (target === "dashboard") {
        await refreshDashboardAndStreaks();
      }
    });
  });
}

async function refreshDashboardAndStreaks() {
  const { currentUserDoc, currentUser } = await import("./auth.js");
  if (!currentUserDoc?.familyId) return;
  await renderDashboard(currentUserDoc.familyId);
  await renderStreaks(currentUser.uid);
}

/* ---------------- Main app bootstrap once family is known ---------------- */

async function enterMainApp() {
  const { currentUserDoc, currentUser } = await import("./auth.js");

  showScreen("feed");
  document.getElementById("appShell").classList.remove("hidden");
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("familyOnboarding").classList.add("hidden");

  document.getElementById("currentUserName").textContent = currentUserDoc.name;
  document.getElementById("currentUserIcon").textContent = currentUserDoc.icon;

  startFeedListener(currentUserDoc.familyId);

  if (!quickLogInitialized) {
    initQuickLog();
    quickLogInitialized = true;
  }
  initSupport(currentUserDoc.familyId);
}

/* ---------------- Top-level auth state handler ---------------- */

function handleAuthState(user, userDoc) {
  if (!user) {
    document.getElementById("appShell").classList.add("hidden");
    document.getElementById("familyOnboarding").classList.add("hidden");
    document.getElementById("authScreen").classList.remove("hidden");
    return;
  }

  if (!userDoc?.familyId) {
    document.getElementById("authScreen").classList.add("hidden");
    document.getElementById("appShell").classList.add("hidden");
    document.getElementById("familyOnboarding").classList.remove("hidden");
    return;
  }

  enterMainApp();
}

/* ---------------- Boot ---------------- */

function boot() {
  bindGlobalUI();
  bindAuthForms();
  bindFamilyForms();
  bindBottomNav();
  renderAvatarPicker();
  onAuthReady(handleAuthState);

  // Register service worker for PWA installability / offline shell.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", boot);
