/**
 * Impact dashboard, charts, calculator, and badges.
 * FUTURE BACKEND: GET /api/impact and GET /api/actions replace localStorage stats.
 */

let actionChart;
let trendChart;

const actionColors = {
  reuse: "#2f6f4e",
  repair: "#c9a227",
  donate: "#c45c5c",
  upcycle: "#3d7ea6",
  recycle: "#6a994e",
};

const monthLabels = () => {
  const labels = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString("en-IN", { month: "short" }));
  }
  return labels;
};

const activitySeries = (actions) => {
  const labels = monthLabels();
  const counts = labels.map(() => 0);
  const now = new Date();
  actions.forEach((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    const diff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (diff >= 0 && diff <= 5) counts[5 - diff] += 1;
  });
  return { labels, counts };
};

const renderStats = () => {
  const stats = window.BYTIStorage.getImpactStats();
  const map = {
    "stat-items": stats.itemsSaved,
    "stat-waste": stats.wasteAvoidedKg,
    "stat-actions": stats.actionsCompleted,
    "stat-streak": stats.streak,
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.count = value;
    el.dataset.decimals = id === "stat-waste" ? "1" : "0";
    if (id === "stat-waste") el.dataset.suffix = "";
  });
  BYTI.animateCounters(document.getElementById("impact-stats"));
  const wasteEl = document.getElementById("stat-waste");
  if (wasteEl) wasteEl.dataset.suffix = "";
};

const renderCharts = () => {
  if (typeof Chart === "undefined") return;
  const stats = window.BYTIStorage.getImpactStats();
  const doughnut = document.getElementById("impactDoughnut");
  const line = document.getElementById("impactTrend");
  if (!doughnut || !line) return;

  const keys = ["reuse", "repair", "donate", "upcycle", "recycle"];
  const data = keys.map((key) => stats.byAction[key] || 0);
  const trend = activitySeries(window.BYTIStorage.getActions());
  const grid = getComputedStyle(document.documentElement).getPropertyValue("--color-border").trim() || "#ddd";
  const text = getComputedStyle(document.documentElement).getPropertyValue("--color-text").trim() || "#222";

  actionChart?.destroy();
  trendChart?.destroy();

  actionChart = new Chart(doughnut, {
    type: "doughnut",
    data: {
      labels: ["Reused", "Repaired", "Donated", "Upcycled", "Recycled"],
      datasets: [{ data, backgroundColor: keys.map((k) => actionColors[k]), borderWidth: 0 }],
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { color: text } } },
      maintainAspectRatio: false,
    },
  });

  trendChart = new Chart(line, {
    type: "line",
    data: {
      labels: trend.labels,
      datasets: [
        {
          label: "Actions",
          data: trend.counts,
          borderColor: "#1b4d3e",
          backgroundColor: "rgba(27, 77, 62, 0.12)",
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: text }, grid: { color: grid } },
        y: { beginAtZero: true, ticks: { stepSize: 1, color: text }, grid: { color: grid } },
      },
      maintainAspectRatio: false,
    },
  });
};

const renderActionsTable = () => {
  const body = document.getElementById("actions-body");
  if (!body) return;
  const actions = window.BYTIStorage.getActions();
  body.innerHTML = actions
    .slice(0, 12)
    .map(
      (item) => `
      <tr>
        <td>${item.itemName}</td>
        <td class="text-capitalize">${item.action}</td>
        <td>${BYTI.formatDate(item.date)}</td>
      </tr>`
    )
    .join("");
};

const renderBadges = () => {
  const grid = document.getElementById("badge-grid");
  if (!grid) return;
  const badges = window.BYTIStorage.getBadges();
  grid.innerHTML = badges
    .map(
      (badge) => `
    <article class="badge-card ${badge.unlocked ? "is-unlocked" : "is-locked"}">
      <span class="badge-icon" aria-hidden="true">${badge.icon}</span>
      <h3>${badge.title}</h3>
      <p>${badge.description}</p>
      <small>${badge.unlocked ? "Unlocked" : "Locked"}</small>
    </article>`
    )
    .join("");
};

const initImpactForm = () => {
  const form = document.getElementById("add-action-form");
  const itemSelect = document.getElementById("action-item");
  if (!form || !itemSelect) return;

  window.BYTIData.ITEMS.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name;
    itemSelect.appendChild(opt);
  });

  const estimate = document.getElementById("calc-result");
  const updateEstimate = () => {
    const item = window.BYTIData.getItemById(itemSelect.value);
    const action = document.getElementById("action-type").value;
    if (!item) return;
    const note =
      item.material === "electronics" && action === "recycle"
        ? "DEMO estimate: responsible e-waste diversion."
        : `DEMO estimate: about ${item.impactGrams} g of waste avoided.`;
    estimate.textContent = note;
  };
  itemSelect.addEventListener("change", updateEstimate);
  document.getElementById("action-type").addEventListener("change", updateEstimate);
  updateEstimate();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = window.BYTIData.getItemById(itemSelect.value);
    window.BYTIStorage.saveAction({
      itemId: item.id,
      itemName: item.name,
      action: document.getElementById("action-type").value,
      grams: item.impactGrams,
    });
    BYTI.toast("Action added to your impact dashboard.");
    refreshImpact();
    form.reset();
    updateEstimate();
  });
};

const refreshImpact = () => {
  renderStats();
  renderCharts();
  renderActionsTable();
  renderBadges();
};

const initImpact = () => {
  if (!document.getElementById("impact-page")) return;
  initImpactForm();
  refreshImpact();
};

document.addEventListener("DOMContentLoaded", initImpact);
