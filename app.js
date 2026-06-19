// scripts/app.js
// Application entry point. Wires together auth state, screen routing,
// and initializes feature modules (feed, log, dashboard, streak, support).

import {
  onAuthReady,
  signUp,
  logIn,
  logOut,
  signInWithGoogle,
  resetPassword,
  updateUserProfile,
  createFamily,
  joinFamilyByCode,
  getFamily,
  AVATAR_ICONS,
} from "./auth.js";
import { startFeedListener, stopFeedListener } from "./feed.js";
import { initQuickLog } from "./log.js";
import { renderDashboard } from "./dashboard.js";
import { renderStreaks } from "./streak.js";
import { initSupport, stopSupportListener } from "./support.js";
import {
  showScreen,
  showToast,
  bindGlobalUI,
  openModal,
  closeModal,
  el,
  showLoading,
  hideLoading,
} from "./ui.js";

let selectedAvatar = AVATAR_ICONS[0];
let selectedProfileAvatar = AVATAR_ICONS[0];
let quickLogInitialized = false;

/* ---------------- Auth screen wiring ---------------- */

function renderAvatarPicker() {
  const picker = document.getElementById("avatarPicker");
  if (!picker) return;
  picker.innerHTML = "";
  AVATAR_ICONS.forEach((icon) => {
    const btn = el("button", "avatar-option" + (icon === selectedAvatar ? " avatar-option--selected" : ""), icon);
    btn.type = "button";
    btn.addEventListener("click", () => {
      selectedAvatar = icon;
      picker.querySelectorAll(".avatar-option").forEach((b) => b.classList.remove("avatar-option--selected"));
      btn.classList.add("avatar-option--selected");
    });
    picker.appendChild(btn);
  });
}

function renderProfileAvatarPicker(currentIcon) {
  const picker = document.getElementById("profileAvatarPicker");
  if (!picker) return;
  selectedProfileAvatar = currentIcon || AVATAR_ICONS[0];
  picker.innerHTML = "";
  AVATAR_ICONS.forEach((icon) => {
    const btn = el(
      "button",
      "avatar-option" + (icon === selectedProfileAvatar ? " avatar-option--selected" : ""),
      icon
    );
    btn.type = "button";
    btn.addEventListener("click", () => {
      selectedProfileAvatar = icon;
      picker.querySelectorAll(".avatar-option").forEach((b) => b.classList.remove("avatar-option--selected"));
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
    showLoading();
    try {
      await logIn(email, password);
    } catch (err) {
      showToast("ログインに失敗しました");
      console.error(err);
    } finally {
      hideLoading();
    }
  });

  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const name = document.getElementById("signupName").value;
    showLoading();
    try {
      await signUp(email, password, name, selectedAvatar);
    } catch (err) {
      showToast("登録に失敗しました");
      console.error(err);
    } finally {
      hideLoading();
    }
  });

  document.getElementById("googleLoginBtn")?.addEventListener("click", async () => {
    showLoading();
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast("Googleログインに失敗しました");
      console.error(err);
    } finally {
      hideLoading();
    }
  });

  document.getElementById("googleSignupBtn")?.addEventListener("click", async () => {
    showLoading();
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast("Google登録に失敗しました");
      console.error(err);
    } finally {
      hideLoading();
    }
  });

  document.getElementById("forgotPasswordBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value;
    if (!email) {
      showToast("メールアドレスを入力してください");
      return;
    }
    showLoading();
    try {
      await resetPassword(email);
      showToast("パスワード再設定メールを送信しました");
    } catch (err) {
      showToast("送信に失敗しました");
      console.error(err);
    } finally {
      hideLoading();
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    stopFeedListener();
    stopSupportListener();
    await logOut();
  });
}

/* ---------------- Profile editing ---------------- */

function bindProfileForm() {
  const editBtn = document.getElementById("editProfileBtn");
  const profileForm = document.getElementById("profileForm");

  editBtn?.addEventListener("click", async () => {
    const { currentUserDoc } = await import("./auth.js");
    document.getElementById("profileNameInput").value = currentUserDoc?.name || "";
    renderProfileAvatarPicker(currentUserDoc?.icon);
    openModal("profileModal");
  });

  profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("profileNameInput").value.trim();
    if (!name) {
      showToast("名前を入力してください");
      return;
    }
    showLoading();
    try {
      await updateUserProfile({ name, icon: selectedProfileAvatar });
      document.getElementById("currentUserName").textContent = name;
      document.getElementById("currentUserIcon").textContent = selectedProfileAvatar;
      document.getElementById("familyScreenUserName").textContent = name;
      document.getElementById("familyScreenUserIcon").textContent = selectedProfileAvatar;
      closeModal("profileModal");
      showToast("プロフィールを更新しました ✓");
    } catch (err) {
      showToast("更新に失敗しました");
      console.error(err);
    } finally {
      hideLoading();
    }
  });
}

/* ---------------- Family onboarding wiring ---------------- */

function bindFamilyForms() {
  const createForm = document.getElementById("createFamilyForm");
  const joinForm = document.getElementById("joinFamilyForm");

  createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("familyNameInput").value;
    showLoading();
    try {
      const { inviteCode } = await createFamily(name);
      showToast(`家族を作成しました（招待コード: ${inviteCode}）`);
      await enterMainApp();
    } catch (err) {
      showToast("作成に失敗しました");
      console.error(err);
    } finally {
      hideLoading();
    }
  });

  joinForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("inviteCodeInput").value;
    showLoading();
    try {
      await joinFamilyByCode(code);
      showToast("家族に参加しました");
      await enterMainApp();
    } catch (err) {
      showToast(err.message || "参加に失敗しました");
      console.error(err);
    } finally {
      hideLoading();
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
      if (target === "family") {
        await renderFamilyInfo();
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

/** Fetch and display the family name + invite code on the family screen. */
async function renderFamilyInfo() {
  const { currentUserDoc } = await import("./auth.js");
  if (!currentUserDoc?.familyId) return;
  const family = await getFamily(currentUserDoc.familyId);
  if (!family) return;
  document.getElementById("familyNameDisplay").textContent = family.name || "--";
  document.getElementById("inviteCodeDisplay").textContent = family.inviteCode || "------";
}

function bindInviteCodeCopy() {
  document.getElementById("copyInviteCodeBtn")?.addEventListener("click", async () => {
    const code = document.getElementById("inviteCodeDisplay").textContent;
    if (!code || code === "------") return;
    try {
      await navigator.clipboard.writeText(code);
      showToast("招待コードをコピーしました ✓");
    } catch (err) {
      showToast("コピーに失敗しました");
      console.error(err);
    }
  });
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
  document.getElementById("familyScreenUserName").textContent = currentUserDoc.name;
  document.getElementById("familyScreenUserIcon").textContent = currentUserDoc.icon;

  startFeedListener(currentUserDoc.familyId, currentUser.uid);
  renderFamilyInfo();

  if (!quickLogInitialized) {
    initQuickLog();
    quickLogInitialized = true;
  }
  initSupport(currentUserDoc.familyId);
}

/* ---------------- Top-level auth state handler ---------------- */

function handleAuthState(user, userDoc) {
  hideLoading();
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
  showLoading();
  bindGlobalUI();
  bindAuthForms();
  bindFamilyForms();
  bindProfileForm();
  bindInviteCodeCopy();
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
