// scripts/feed.js
// Realtime chronological feed of family activity for "today".
// Uses a single onSnapshot listener scoped to familyId + today's date range
// to keep reads minimal (no polling, no extra queries).

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  doc,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { el, formatDurationJP, formatTimeJP, showToast, confirmAction } from "./ui.js";
import { CATEGORY_TYPES } from "./categories.js";

let unsubscribeFeed = null;
const feedListEl = document.getElementById("feedList");
const feedEmptyEl = document.getElementById("feedEmpty");

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

function categoryColor(categoryType) {
  const found = CATEGORY_TYPES.find((c) => c.id === categoryType);
  return found ? found.color : "var(--color-active)";
}

/** Delete a log entry (only the owner can do this — also enforced by Firestore rules). */
async function deleteLog(logId, itemEl) {
  const confirmed = await confirmAction("この記録を削除しますか？");
  if (!confirmed) return;
  try {
    itemEl.classList.add("feed-item--removing");
    await deleteDoc(doc(db, "logs", logId));
    // onSnapshot will re-render the list; no manual DOM removal needed.
  } catch (err) {
    itemEl.classList.remove("feed-item--removing");
    console.error(err);
    showToast("削除に失敗しました");
  }
}

/** Render one feed entry as a glass card. Adds a delete button for the owner's own entries. */
function renderFeedItem(logId, logData, currentUserId) {
  const item = el("li", "feed-item");
  item.style.setProperty("--accent", categoryColor(logData.categoryType));

  const avatar = el("div", "feed-item__avatar", logData.userIcon || "🙂");
  const body = el("div", "feed-item__body");

  const top = el("div", "feed-item__top");
  const name = el("span", "feed-item__name", logData.userName || "家族");
  const time = el("span", "feed-item__time", logData.createdAt ? formatTimeJP(logData.createdAt) : "--:--");
  top.append(name, time);

  const detail = el(
    "div",
    "feed-item__detail",
    `${logData.detailIcon || ""} ${logData.detailLabel || ""} ・ ${formatDurationJP(logData.durationMinutes)}`
  );

  body.append(top, detail);
  item.append(avatar, body);

  // Only the entry's owner may delete it.
  if (logData.userId === currentUserId) {
    const deleteBtn = el("button", "feed-item__delete", "✕");
    deleteBtn.setAttribute("aria-label", "削除する");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteLog(logId, item);
    });
    item.appendChild(deleteBtn);
  }

  return item;
}

/** Subscribe to today's logs for the user's family and render them live. */
export function startFeedListener(familyId, currentUserId) {
  stopFeedListener();
  const logsRef = collection(db, "logs");
  const q = query(
    logsRef,
    where("familyId", "==", familyId),
    where("createdAt", ">=", startOfToday()),
    orderBy("createdAt", "desc"),
    limit(50) // cap reads; older entries available via dashboard history, not live feed
  );

  unsubscribeFeed = onSnapshot(q, (snapshot) => {
    feedListEl.innerHTML = "";
    if (snapshot.empty) {
      feedEmptyEl.classList.remove("hidden");
      return;
    }
    feedEmptyEl.classList.add("hidden");
    snapshot.forEach((docSnap) => {
      feedListEl.appendChild(renderFeedItem(docSnap.id, docSnap.data(), currentUserId));
    });
  });
}

/** Detach the realtime listener (call on logout / screen teardown). */
export function stopFeedListener() {
  if (unsubscribeFeed) {
    unsubscribeFeed();
    unsubscribeFeed = null;
  }
}
