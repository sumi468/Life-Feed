// scripts/dashboard.js
// Computes and renders the day's stats: active/passive time, dependency count,
// family time, passive breakdown, and a yesterday comparison.
// Uses a one-shot getDocs (not realtime) for both today & yesterday to limit reads —
// the dashboard is refreshed on screen entry, not continuously.

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { el, formatDurationJP } from "./ui.js";

function rangeForDate(dateOffsetDays) {
  const start = new Date();
  start.setDate(start.getDate() + dateOffsetDays);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

async function fetchLogsForRange(familyId, start, end) {
  const logsRef = collection(db, "logs");
  const q = query(
    logsRef,
    where("familyId", "==", familyId),
    where("createdAt", ">=", start),
    where("createdAt", "<", end)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/** Reduce a list of log docs into the summary shape the dashboard renders. */
function summarize(logs) {
  const summary = {
    activeMinutes: 0,
    passiveMinutes: 0,
    dependencyCount: 0,
    familyMinutes: 0,
    passiveBreakdown: {}, // detailLabel -> minutes
  };

  logs.forEach((log) => {
    const minutes = log.durationMinutes || 0;
    if (log.categoryType === "active") {
      summary.activeMinutes += minutes;
      if (log.detailId === "family") summary.familyMinutes += minutes;
    } else if (log.categoryType === "passive") {
      summary.passiveMinutes += minutes;
      summary.passiveBreakdown[log.detailLabel] =
        (summary.passiveBreakdown[log.detailLabel] || 0) + minutes;
    } else if (log.categoryType === "dependency") {
      summary.dependencyCount += 1;
    }
  });

  return summary;
}

function renderStatCard(container, label, value) {
  const card = el("div", "stat-card");
  card.append(el("span", "stat-card__label", label), el("span", "stat-card__value", value));
  container.appendChild(card);
}

function renderComparisonRow(label, todayVal, yesterdayVal, formatter) {
  const row = el("div", "compare-row");
  const diff = todayVal - yesterdayVal;
  const diffLabel = diff === 0 ? "変化なし" : diff > 0 ? `+${formatter(diff)}` : `-${formatter(Math.abs(diff))}`;
  const diffClass = diff > 0 ? "compare-row__diff--up" : diff < 0 ? "compare-row__diff--down" : "";
  row.append(
    el("span", "compare-row__label", label),
    el("span", `compare-row__diff ${diffClass}`, diffLabel)
  );
  return row;
}

/** Fetch today + yesterday logs, compute summaries, and paint the dashboard DOM. */
export async function renderDashboard(familyId) {
  const todayRange = rangeForDate(0);
  const yestRange = rangeForDate(-1);

  const [todayLogs, yesterdayLogs] = await Promise.all([
    fetchLogsForRange(familyId, todayRange.start, todayRange.end),
    fetchLogsForRange(familyId, yestRange.start, yestRange.end),
  ]);

  const today = summarize(todayLogs);
  const yesterday = summarize(yesterdayLogs);

  // Top stat grid
  const statGrid = document.getElementById("statGrid");
  statGrid.innerHTML = "";
  renderStatCard(statGrid, "行動時間", formatDurationJP(today.activeMinutes));
  renderStatCard(statGrid, "受動時間", formatDurationJP(today.passiveMinutes));
  renderStatCard(statGrid, "依存回数", `${today.dependencyCount}回`);
  renderStatCard(statGrid, "家族時間", formatDurationJP(today.familyMinutes));

  // Balance bar (active vs passive vs dependency-weighted)
  const total = today.activeMinutes + today.passiveMinutes || 1;
  const activeRatio = Math.round((today.activeMinutes / total) * 100);
  const balanceBar = document.getElementById("balanceBar");
  balanceBar.innerHTML = "";
  const activeSeg = el("div", "balance-bar__seg balance-bar__seg--active");
  activeSeg.style.width = `${activeRatio}%`;
  const passiveSeg = el("div", "balance-bar__seg balance-bar__seg--passive");
  passiveSeg.style.width = `${100 - activeRatio}%`;
  balanceBar.append(activeSeg, passiveSeg);
  document.getElementById("balanceLabel").textContent = `行動 ${activeRatio}% ・ 受動 ${100 - activeRatio}%`;

  // Passive breakdown list
  const breakdownList = document.getElementById("passiveBreakdownList");
  breakdownList.innerHTML = "";
  const entries = Object.entries(today.passiveBreakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    breakdownList.appendChild(el("li", "empty-note", "受動的な活動の記録はまだありません"));
  } else {
    entries.forEach(([label, minutes]) => {
      const li = el("li", "breakdown-row");
      li.append(el("span", "", label), el("span", "breakdown-row__value", formatDurationJP(minutes)));
      breakdownList.appendChild(li);
    });
  }

  // Yesterday comparison
  const compareList = document.getElementById("compareList");
  compareList.innerHTML = "";
  compareList.append(
    renderComparisonRow("行動時間", today.activeMinutes, yesterday.activeMinutes, formatDurationJP),
    renderComparisonRow("受動時間", today.passiveMinutes, yesterday.passiveMinutes, formatDurationJP),
    renderComparisonRow("依存回数", today.dependencyCount, yesterday.dependencyCount, (n) => `${n}回`)
  );
}
