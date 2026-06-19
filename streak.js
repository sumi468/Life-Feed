// scripts/streak.js
// Computes simple day-by-day streaks (abstain or perform type) by scanning
// recent personal logs. Streak docs are cached in Firestore (streaks/{uid_streakId})
// so we don't recompute from full history every time — only verify/extend daily.

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { STREAKS } from "./categories.js";
import { el } from "./ui.js";

function dateKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function startEndOfDay(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

/** Did the user log `detailId` at least once on the given day? */
async function detailLoggedOnDay(userId, detailId, day) {
  const { start, end } = startEndOfDay(day);
  const logsRef = collection(db, "logs");
  const q = query(
    logsRef,
    where("userId", "==", userId),
    where("detailId", "==", detailId),
    where("createdAt", ">=", start),
    where("createdAt", "<", end),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Compute a single streak's current length by walking backwards from today
 * until the condition breaks. Capped at 60 days to bound read cost.
 */
async function computeStreak(userId, streakDef) {
  let count = 0;
  const cursor = new Date();
  for (let i = 0; i < 60; i++) {
    const logged = await detailLoggedOnDay(userId, streakDef.detailId, cursor);
    const dayCounts = streakDef.type === "perform" ? logged : !logged;
    // For "today" specifically, an unfinished day shouldn't break an abstain streak yet.
    if (i === 0 && streakDef.type === "abstain" && logged) {
      // user logged the bad habit today -> streak resets to 0
      return 0;
    }
    if (!dayCounts) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/** Render the streak cards. Caches results in Firestore for cheap reuse same-day. */
export async function renderStreaks(userId) {
  const container = document.getElementById("streakList");
  container.innerHTML = "";

  for (const streakDef of STREAKS) {
    const cacheRef = doc(db, "streaks", `${userId}_${streakDef.id}`);
    const cacheSnap = await getDoc(cacheRef);
    const today = dateKey(new Date());

    let count;
    if (cacheSnap.exists() && cacheSnap.data().lastChecked === today) {
      count = cacheSnap.data().count;
    } else {
      count = await computeStreak(userId, streakDef);
      await setDoc(cacheRef, { count, lastChecked: today, userId, streakId: streakDef.id });
    }

    const card = el("div", "streak-card");
    card.append(
      el("span", "streak-card__icon", streakDef.icon),
      el("span", "streak-card__label", streakDef.label),
      el("span", "streak-card__count", `${count}日`)
    );
    container.appendChild(card);
  }
}
