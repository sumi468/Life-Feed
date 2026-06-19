// data/categories.js
// Static definitions for the Quick Log flow.
// Kept separate from logic so labels/icons can be tuned without touching app code.

export const DURATIONS = [
  { value: 5, label: "5分" },
  { value: 15, label: "15分" },
  { value: 30, label: "30分" },
  { value: 60, label: "1時間" },
  { value: 120, label: "2時間" },
  { value: 180, label: "3時間" },
];

// Top-level category types. Used for both UI and dashboard aggregation.
export const CATEGORY_TYPES = [
  { id: "active", label: "行動", color: "var(--color-active)", icon: "🏃" },
  { id: "passive", label: "受動", color: "var(--color-passive)", icon: "📱" },
  { id: "dependency", label: "依存", color: "var(--color-dependency)", icon: "⚠️" },
];

// Detail options per category type.
export const CATEGORY_DETAILS = {
  active: [
    { id: "work", label: "仕事", icon: "💼" },
    { id: "study", label: "勉強", icon: "📘" },
    { id: "chores", label: "家事", icon: "🧺" },
    { id: "exercise", label: "運動", icon: "💪" },
    { id: "walk", label: "散歩", icon: "🚶" },
    { id: "reading", label: "読書", icon: "📖" },
    { id: "cooking", label: "料理", icon: "🍳" },
    { id: "family", label: "家族時間", icon: "👨‍👩‍👧" },
    { id: "shopping", label: "買い物", icon: "🛍️" },
  ],
  passive: [
    { id: "tiktok", label: "TikTok", icon: "🎵" },
    { id: "youtube", label: "YouTube", icon: "▶️" },
    { id: "netflix", label: "Netflix", icon: "🎬" },
    { id: "tv", label: "テレビ", icon: "📺" },
    { id: "sns", label: "SNS", icon: "💬" },
    { id: "game", label: "ゲーム", icon: "🎮" },
    { id: "browsing", label: "ネット閲覧", icon: "🌐" },
  ],
  dependency: [
    { id: "alcohol", label: "飲酒", icon: "🍺" },
    { id: "smoking", label: "喫煙", icon: "🚬" },
    { id: "lateNightScroll", label: "深夜スクロール", icon: "🌙" },
  ],
};

// Support request quick options.
export const SUPPORT_OPTIONS = [
  { id: "talk", label: "話したい", icon: "💬" },
  { id: "walk", label: "散歩したい", icon: "🚶" },
  { id: "stop", label: "やめたい", icon: "✋" },
  { id: "hard", label: "今きつい", icon: "🆘" },
];

// Streak definitions: which detail ids feed which streak, and the streak's "good" direction.
// type: "abstain" -> streak grows while the detail is NOT logged that day
// type: "perform" -> streak grows while the detail IS logged that day
export const STREAKS = [
  { id: "alcohol_free", label: "禁酒記録", type: "abstain", detailId: "alcohol", icon: "🍃" },
  { id: "family_talk", label: "会話記録", type: "perform", detailId: "family", icon: "🗣️" },
  { id: "exercise", label: "運動記録", type: "perform", detailId: "exercise", icon: "🔥" },
];
