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
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { el, formatDurationJP, formatTimeJP } from "./ui.js";
import { CATEGORY_TYPES } from "../data/categories.js";

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

/** Render one feed entry as a glass card. */
function renderFeedItem(logData) {
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
  return item;
}

/** Subscribe to today's logs for the user's family and render them live. */
export function startFeedListener(familyId) {
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
      feedListEl.appendChild(renderFeedItem(docSnap.data()));
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
