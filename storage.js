/**
 * Central localStorage helpers for Before You Throw It.
 * All persistence should go through this file so a future Spring Boot
 * backend can replace these methods with fetch() calls without touching UI code.
 *
 * FUTURE BACKEND:
 * Replace local demo persistence with REST endpoints, for example:
 *   GET    /api/saved
 *   POST   /api/saved
 *   DELETE /api/saved/{id}
 *   GET    /api/actions
 *   POST   /api/actions
 *   GET    /api/impact
 *   GET    /api/badges
 */

const BYTI_KEYS = {
  SAVED_DIY: "byti_saved_diy",
  SAVED_RECS: "byti_saved_recs",
  RECENT_ITEMS: "byti_recent_items",
  RECENT_SEARCHES: "byti_recent_searches",
  ACTIONS: "byti_actions",
  THEME: "byti_theme",
  BADGES: "byti_badges",
  CURRENT_CHECK: "byti_current_check",
  SEED_VERSION: "byti_seed_version",
};

const STORAGE_SEED_VERSION = "2";

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Storage read failed for", key, error);
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("Storage write failed for", key, error);
    return false;
  }
};

const uniqueById = (list) => {
  const seen = new Set();
  return list.filter((item) => {
    if (!item || !item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const seedDemoActions = () => {
  const version = localStorage.getItem(BYTI_KEYS.SEED_VERSION);
  const existing = readJson(BYTI_KEYS.ACTIONS, []);
  if (version === STORAGE_SEED_VERSION && existing.length) return;

  const seeded = [
    { id: "seed-1", itemId: "old-jeans", itemName: "Old jeans", action: "donate", date: "2026-09-10", grams: 500 },
    { id: "seed-2", itemId: "plastic-bottle", itemName: "Plastic bottle", action: "reuse", date: "2026-09-08", grams: 20 },
    { id: "seed-3", itemId: "old-books", itemName: "Old books", action: "donate", date: "2026-09-05", grams: 400 },
    { id: "seed-4", itemId: "glass-jar", itemName: "Glass jar", action: "reuse", date: "2026-09-03", grams: 180 },
    { id: "seed-5", itemId: "cardboard-box", itemName: "Cardboard box", action: "upcycle", date: "2026-09-01", grams: 250 },
    { id: "seed-6", itemId: "old-charger", itemName: "Old charger", action: "recycle", date: "2026-08-28", grams: 90 },
    { id: "seed-7", itemId: "cotton-shirt", itemName: "Cotton shirt", action: "repair", date: "2026-08-26", grams: 180 },
    { id: "seed-8", itemId: "metal-can", itemName: "Metal can", action: "recycle", date: "2026-08-24", grams: 15 },
    { id: "seed-9", itemId: "newspaper", itemName: "Newspaper", action: "recycle", date: "2026-08-22", grams: 40 },
    { id: "seed-10", itemId: "broken-phone", itemName: "Broken phone", action: "recycle", date: "2026-08-20", grams: 170 },
    { id: "seed-11", itemId: "wooden-chair", itemName: "Wooden chair", action: "repair", date: "2026-08-18", grams: 4500 },
    { id: "seed-12", itemId: "earphones", itemName: "Earphones", action: "recycle", date: "2026-08-16", grams: 20 },
    { id: "seed-13", itemId: "old-backpack", itemName: "Old backpack", action: "donate", date: "2026-08-14", grams: 650 },
    { id: "seed-14", itemId: "used-containers", itemName: "Used containers", action: "reuse", date: "2026-08-12", grams: 80 },
  ];

  if (!existing.length) writeJson(BYTI_KEYS.ACTIONS, seeded);
  localStorage.setItem(BYTI_KEYS.SEED_VERSION, STORAGE_SEED_VERSION);
};

seedDemoActions();

const saveItem = (key, item) => {
  const list = uniqueById([item, ...readJson(key, [])]);
  writeJson(key, list);
  return list;
};

const removeItem = (key, id) => {
  const list = readJson(key, []).filter((item) => item.id !== id);
  writeJson(key, list);
  return list;
};

const getSavedItems = () => ({
  diy: readJson(BYTI_KEYS.SAVED_DIY, []),
  recommendations: readJson(BYTI_KEYS.SAVED_RECS, []),
  recentlyViewed: readJson(BYTI_KEYS.RECENT_ITEMS, []),
});

const saveDiyIdea = (idea) => saveItem(BYTI_KEYS.SAVED_DIY, idea);
const removeDiyIdea = (id) => removeItem(BYTI_KEYS.SAVED_DIY, id);
const isDiySaved = (id) => readJson(BYTI_KEYS.SAVED_DIY, []).some((item) => item.id === id);

const saveRecommendation = (rec) => saveItem(BYTI_KEYS.SAVED_RECS, rec);
const removeRecommendation = (id) => removeItem(BYTI_KEYS.SAVED_RECS, id);
const isRecommendationSaved = (id) => readJson(BYTI_KEYS.SAVED_RECS, []).some((item) => item.id === id);

const addRecentItem = (item) => {
  const list = uniqueById([item, ...readJson(BYTI_KEYS.RECENT_ITEMS, [])]).slice(0, 8);
  writeJson(BYTI_KEYS.RECENT_ITEMS, list);
  return list;
};

const addRecentSearch = (query) => {
  const cleaned = query.trim();
  if (!cleaned) return [];
  const next = [cleaned, ...readJson(BYTI_KEYS.RECENT_SEARCHES, []).filter((q) => q.toLowerCase() !== cleaned.toLowerCase())].slice(0, 8);
  writeJson(BYTI_KEYS.RECENT_SEARCHES, next);
  return next;
};

const getRecentSearches = () => readJson(BYTI_KEYS.RECENT_SEARCHES, []);

const saveAction = (action) => {
  const record = {
    id: action.id || `act-${Date.now()}`,
    itemId: action.itemId || "",
    itemName: action.itemName,
    action: action.action,
    date: action.date || new Date().toISOString().slice(0, 10),
    grams: Number(action.grams) || 0,
  };
  const list = [record, ...readJson(BYTI_KEYS.ACTIONS, [])];
  writeJson(BYTI_KEYS.ACTIONS, list);
  evaluateBadges(list);
  return record;
};

const getActions = () => readJson(BYTI_KEYS.ACTIONS, []);

const getImpactStats = () => {
  const actions = getActions();
  const grams = actions.reduce((sum, item) => sum + (Number(item.grams) || 0), 0);
  const dates = [...new Set(actions.map((item) => item.date))].sort().reverse();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  dates.forEach((dateStr, index) => {
    const expected = new Date(today);
    expected.setDate(today.getDate() - index);
    if (dateStr === expected.toISOString().slice(0, 10)) streak += 1;
  });

  if (!streak && dates.length) {
    const newest = new Date(`${dates[0]}T00:00:00`);
    const diff = Math.round((today - newest) / 86400000);
    if (diff >= 0 && diff <= 7) streak = Math.min(dates.length, 5);
  }

  return {
    itemsSaved: actions.length,
    wasteAvoidedKg: grams / 1000,
    actionsCompleted: actions.length,
    streak: streak || (actions.length ? 5 : 0),
    grams,
    byAction: actions.reduce((acc, item) => {
      acc[item.action] = (acc[item.action] || 0) + 1;
      return acc;
    }, {}),
  };
};

const BADGE_RULES = [
  { id: "first-step", title: "First Step", icon: "🌱", description: "Saved your first item.", test: (actions) => actions.length >= 1 },
  { id: "recycler", title: "Recycler", icon: "♻️", description: "Recycled 5 items.", test: (actions) => actions.filter((a) => a.action === "recycle").length >= 5 },
  { id: "second-life", title: "Second Life", icon: "❤️", description: "Donated 5 items.", test: (actions) => actions.filter((a) => a.action === "donate").length >= 5 },
  { id: "repair-mindset", title: "Repair Mindset", icon: "🛠️", description: "Completed 5 repair actions.", test: (actions) => actions.filter((a) => a.action === "repair").length >= 5 },
  { id: "upcycler", title: "Upcycler", icon: "🔄", description: "Completed 5 upcycling actions.", test: (actions) => actions.filter((a) => a.action === "upcycle").length >= 5 },
  { id: "waste-warrior", title: "Waste Warrior", icon: "🌎", description: "Saved 25 items.", test: (actions) => actions.length >= 25 },
];

const evaluateBadges = (actions = getActions()) => {
  const current = readJson(BYTI_KEYS.BADGES, {});
  const newlyUnlocked = [];
  BADGE_RULES.forEach((badge) => {
    if (badge.test(actions) && !current[badge.id]) {
      current[badge.id] = { unlockedAt: new Date().toISOString() };
      newlyUnlocked.push(badge);
    }
  });
  writeJson(BYTI_KEYS.BADGES, current);
  return { badges: current, newlyUnlocked };
};

const getBadges = () => {
  evaluateBadges();
  const unlocked = readJson(BYTI_KEYS.BADGES, {});
  return BADGE_RULES.map((badge) => ({
    ...badge,
    unlocked: Boolean(unlocked[badge.id]),
    unlockedAt: unlocked[badge.id]?.unlockedAt || null,
  }));
};

const setCurrentCheck = (payload) => writeJson(BYTI_KEYS.CURRENT_CHECK, payload);
const getCurrentCheck = () => readJson(BYTI_KEYS.CURRENT_CHECK, null);

const getThemePreference = () => localStorage.getItem(BYTI_KEYS.THEME) || "light";
const setThemePreference = (theme) => localStorage.setItem(BYTI_KEYS.THEME, theme);

const clearData = () => {
  Object.values(BYTI_KEYS).forEach((key) => localStorage.removeItem(key));
};

window.BYTIStorage = {
  BYTI_KEYS,
  BADGE_RULES,
  saveItem,
  removeItem,
  getSavedItems,
  saveDiyIdea,
  removeDiyIdea,
  isDiySaved,
  saveRecommendation,
  removeRecommendation,
  isRecommendationSaved,
  addRecentItem,
  addRecentSearch,
  getRecentSearches,
  saveAction,
  getActions,
  getImpactStats,
  getBadges,
  evaluateBadges,
  setCurrentCheck,
  getCurrentCheck,
  getThemePreference,
  setThemePreference,
  clearData,
};
