// scripts/support.js
// Emergency support button: lets a user broadcast a quick request to their family
// (e.g. "話したい") and shows incoming requests from family members in realtime.

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { SUPPORT_OPTIONS } from "../data/categories.js";
import { el, showToast, openModal, closeModal, formatTimeJP } from "./ui.js";
import { currentUser, currentUserDoc } from "./auth.js";

let unsubscribeSupport = null;

/** Build the option grid inside the support modal. */
function renderSupportOptions() {
  const grid = document.getElementById("supportOptions");
  grid.innerHTML = "";
  SUPPORT_OPTIONS.forEach((opt) => {
    const btn = el("button", "support-option");
    btn.append(el("span", "support-option__icon", opt.icon), el("span", "", opt.label));
    btn.addEventListener("click", () => sendSupportRequest(opt));
    grid.appendChild(btn);
  });
}

/** Write a support request doc visible to the whole family. */
async function sendSupportRequest(option) {
  if (!currentUser || !currentUserDoc?.familyId) {
    showToast("家族に参加してから利用できます");
    return;
  }
  try {
    await addDoc(collection(db, "support_requests"), {
      familyId: currentUserDoc.familyId,
      userId: currentUser.uid,
      userName: currentUserDoc.name,
      userIcon: currentUserDoc.icon,
      type: option.id,
      label: option.label,
      createdAt: serverTimestamp(),
    });
    closeModal("supportModal");
    showToast("家族に伝えました 💙");
  } catch (err) {
    console.error(err);
    showToast("送信に失敗しました");
  }
}

function renderIncomingItem(req) {
  const item = el("li", "support-item");
  item.append(
    el("span", "support-item__icon", req.userIcon || "🙂"),
    el(
      "span",
      "support-item__text",
      `${req.userName || "家族"} さんが「${req.label}」と伝えています`
    ),
    el("span", "support-item__time", req.createdAt ? formatTimeJP(req.createdAt) : "")
  );
  return item;
}

/** Listen for recent (last few) support requests within the family, newest first. */
function listenForIncomingSupport(familyId) {
  if (unsubscribeSupport) unsubscribeSupport();
  const reqRef = collection(db, "support_requests");
  const q = query(
    reqRef,
    where("familyId", "==", familyId),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  unsubscribeSupport = onSnapshot(q, (snap) => {
    const list = document.getElementById("supportIncomingList");
    if (!list) return;
    list.innerHTML = "";
    if (snap.empty) {
      list.appendChild(el("li", "empty-note", "現在、サポートのお知らせはありません"));
      return;
    }
    snap.forEach((d) => list.appendChild(renderIncomingItem(d.data())));
  });
}

/** Public init: wire the floating support button + start the incoming listener. */
export function initSupport(familyId) {
  renderSupportOptions();
  const trigger = document.getElementById("supportFab");
  trigger.addEventListener("click", () => openModal("supportModal"));
  if (familyId) listenForIncomingSupport(familyId);
}

export function stopSupportListener() {
  if (unsubscribeSupport) {
    unsubscribeSupport();
    unsubscribeSupport = null;
  }
}
