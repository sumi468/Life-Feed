// scripts/log.js
// The Quick Log flow: duration -> category -> detail -> save.
// Designed to complete in exactly 3 taps as required by spec.

import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { DURATIONS, CATEGORY_TYPES, CATEGORY_DETAILS } from "../data/categories.js";
import { el, showToast, closeModal, openModal } from "./ui.js";
import { currentUser, currentUserDoc } from "./auth.js";

let selectedDuration = null;
let selectedCategory = null;

const stepDurationEl = document.getElementById("logStepDuration");
const stepCategoryEl = document.getElementById("logStepCategory");
const stepDetailEl = document.getElementById("logStepDetail");
const logModalTitle = document.getElementById("logModalTitle");

/** Reset wizard state and show step 1. Called every time the modal opens. */
function resetLogFlow() {
  selectedDuration = null;
  selectedCategory = null;
  stepDurationEl.classList.add("log-step--active");
  stepCategoryEl.classList.remove("log-step--active");
  stepDetailEl.classList.remove("log-step--active");
  logModalTitle.textContent = "時間を選択";
}

/** Render the duration buttons (step 1). */
function renderDurationStep() {
  stepDurationEl.innerHTML = "";
  DURATIONS.forEach((d) => {
    const btn = el("button", "chip chip--lg", d.label);
    btn.addEventListener("click", () => {
      selectedDuration = d.value;
      goToCategoryStep();
    });
    stepDurationEl.appendChild(btn);
  });
}

function goToCategoryStep() {
  stepDurationEl.classList.remove("log-step--active");
  stepCategoryEl.classList.add("log-step--active");
  logModalTitle.textContent = "カテゴリーを選択";
}

/** Render the 3 category type buttons (step 2). */
function renderCategoryStep() {
  stepCategoryEl.innerHTML = "";
  CATEGORY_TYPES.forEach((cat) => {
    const btn = el("button", "category-card");
    btn.style.setProperty("--cat-color", cat.color);
    const icon = el("span", "category-card__icon", cat.icon);
    const label = el("span", "category-card__label", cat.label);
    btn.append(icon, label);
    btn.addEventListener("click", () => {
      selectedCategory = cat.id;
      goToDetailStep(cat);
    });
    stepCategoryEl.appendChild(btn);
  });
}

function goToDetailStep(cat) {
  stepCategoryEl.classList.remove("log-step--active");
  stepDetailEl.classList.add("log-step--active");
  logModalTitle.textContent = `${cat.label} の詳細`;
  renderDetailStep(cat.id);
}

/** Render detail chips for the chosen category (step 3) and bind save-on-tap. */
function renderDetailStep(categoryId) {
  stepDetailEl.innerHTML = "";
  CATEGORY_DETAILS[categoryId].forEach((detail) => {
    const btn = el("button", "chip chip--detail");
    const icon = el("span", "", detail.icon);
    const label = el("span", "", ` ${detail.label}`);
    btn.append(icon, label);
    btn.addEventListener("click", () => saveLog(categoryId, detail));
    stepDetailEl.appendChild(btn);
  });
}

/** Write the log entry to Firestore and close the modal. */
async function saveLog(categoryId, detail) {
  if (!currentUser || !currentUserDoc?.familyId) {
    showToast("家族に参加してから記録してください");
    return;
  }
  try {
    await addDoc(collection(db, "logs"), {
      familyId: currentUserDoc.familyId,
      userId: currentUser.uid,
      userName: currentUserDoc.name,
      userIcon: currentUserDoc.icon,
      categoryType: categoryId, // active | passive | dependency
      detailId: detail.id,
      detailLabel: detail.label,
      detailIcon: detail.icon,
      durationMinutes: selectedDuration,
      createdAt: serverTimestamp(),
    });
    closeModal("logModal");
    showToast("記録しました ✓");
  } catch (err) {
    console.error(err);
    showToast("記録に失敗しました");
  }
}

/** Public entry point: wires up the floating "記録する" button and modal lifecycle. */
export function initQuickLog() {
  renderDurationStep();
  renderCategoryStep();

  const fab = document.getElementById("quickLogFab");
  fab.addEventListener("click", () => {
    resetLogFlow();
    openModal("logModal");
  });
}
