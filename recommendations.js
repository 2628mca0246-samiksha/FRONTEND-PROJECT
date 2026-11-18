/**
 * Recommendation engine for the Check an Item → Results flow.
 *
 * FUTURE BACKEND / AI:
 * After collecting item, condition, and preference, send:
 *   POST /api/recommendations
 *   { itemId, condition, preference, userContext }
 * Then render the JSON response here instead of local ranking.
 *
 * Future AI hook:
 *   const ai = await fetch('/api/ai/recommend', { method: 'POST', body: JSON.stringify(payload) })
 *   const ranked = await ai.json()
 */

const CONDITION_LABELS = {
  working: "Working / usable",
  minor: "Minor damage",
  major: "Major damage",
  unusable: "Completely unusable",
};

const ACTION_ORDER = ["reuse", "repair", "donate", "sell", "upcycle", "recycle", "dispose"];

const effortFor = (action, condition) => {
  if (action === "reuse" && condition === "working") return { difficulty: "Easy", effort: "5–15 min" };
  if (action === "donate") return { difficulty: "Easy", effort: "Drop-off visit" };
  if (action === "sell") return { difficulty: "Medium", effort: "Listing + pickup" };
  if (action === "repair" && condition === "minor") return { difficulty: "Medium", effort: "20–60 min" };
  if (action === "repair") return { difficulty: "Hard", effort: "Workshop visit" };
  if (action === "upcycle") return { difficulty: "Medium", effort: "15–45 min" };
  if (action === "recycle") return { difficulty: "Easy", effort: "Sort and drop" };
  return { difficulty: "Varies", effort: "Plan first" };
};

const whyFor = (item, action, condition, preference) => {
  const preferred = preference === action;
  const bits = [];
  if (action === "reuse") bits.push("The item can still serve a purpose without extra processing.");
  if (action === "repair") bits.push("Restoring it avoids buying a replacement.");
  if (action === "donate") bits.push("Someone else can use it in its current form.");
  if (action === "sell") bits.push("There is still resale value in working or lightly worn goods.");
  if (action === "upcycle") bits.push("A new purpose keeps material out of the bin.");
  if (action === "recycle") bits.push("Materials can re-enter manufacturing when reuse is no longer practical.");
  if (action === "dispose") bits.push("Only remaining option when the item is unsafe or cannot be processed locally.");
  if (condition === "working" && ["reuse", "donate", "sell"].includes(action)) bits.push("Condition is still good.");
  if (condition === "unusable" && ["recycle", "dispose"].includes(action)) bits.push("Usable life appears over.");
  if (preferred) bits.push("This matches the preference you selected.");
  bits.push(item.tips);
  return bits.join(" ");
};

const descriptionFor = (item, action) => {
  const map = {
    reuse: `Keep using your ${item.name.toLowerCase()} as-is, or give it a simple second job at home.`,
    repair: `A repair may restore your ${item.name.toLowerCase()} instead of replacing it.`,
    donate: `If it is clean and complete, donate your ${item.name.toLowerCase()} so it can be used again.`,
    sell: `List your ${item.name.toLowerCase()} locally if it still has value.`,
    upcycle: `Turn your ${item.name.toLowerCase()} into something new with a short project.`,
    recycle: `Use the correct recycling or e-waste stream for this ${item.material} item.`,
    dispose: `Disposal is the last option for this ${item.name.toLowerCase()} if other routes are unsafe.`,
  };
  return map[action];
};

const eligibleActions = (item, condition) => {
  const allowed = new Set(item.possibleActions);
  if (condition === "working") {
    allowed.delete("dispose");
  }
  if (condition === "minor") {
    allowed.add("repair");
  }
  if (condition === "major") {
    allowed.delete("sell");
    allowed.add("repair");
    allowed.add("upcycle");
    allowed.add("recycle");
  }
  if (condition === "unusable") {
    ["reuse", "donate", "sell"].forEach((key) => allowed.delete(key));
    allowed.add("recycle");
    allowed.add("dispose");
  }
  if (!allowed.has("recycle") && condition === "unusable") allowed.add("dispose");
  return ACTION_ORDER.filter((action) => allowed.has(action) || (action === "dispose" && condition === "unusable"));
};

const scoreAction = (action, condition, preference) => {
  let score = 70 - ACTION_ORDER.indexOf(action) * 6;
  if (preference === action) score += 24;
  if (preference === "not-sure" && action === "reuse") score += 8;
  if (condition === "working" && ["reuse", "donate", "sell"].includes(action)) score += 12;
  if (condition === "minor" && action === "repair") score += 14;
  if (condition === "major" && ["repair", "upcycle", "recycle"].includes(action)) score += 10;
  if (condition === "unusable" && action === "recycle") score += 18;
  if (condition === "unusable" && action === "dispose") score += 4;
  if (action === "dispose") score -= 20;
  return score;
};

const buildRecommendations = (item, condition, preference) => {
  // FUTURE AI COMPATIBILITY:
  // If an AI API is connected, merge or replace this ranked list with model output.
  const actions = eligibleActions(item, condition);
  return actions
    .map((action) => {
      const meta = effortFor(action, condition);
      return {
        action,
        title: window.BYTIData.ACTION_COPY[action].title,
        icon: window.BYTIData.ACTION_COPY[action].icon,
        description: descriptionFor(item, action),
        difficulty: meta.difficulty,
        effort: meta.effort,
        why: whyFor(item, action, condition, preference),
        score: scoreAction(action, condition, preference),
        impactNote: item.impactNote,
        grams: item.impactGrams,
      };
    })
    .sort((a, b) => b.score - a.score);
};

const initCheckItem = () => {
  const page = document.getElementById("check-item-page");
  if (!page || !window.BYTIData) return;

  const searchInput = document.getElementById("item-search");
  const suggestBox = document.getElementById("search-suggestions");
  const itemGrid = document.getElementById("item-results");
  const categoryGrid = document.getElementById("category-grid");
  const selectedLabel = document.getElementById("selected-item-label");
  const formError = document.getElementById("check-form-error");
  const params = new URLSearchParams(window.location.search);

  let selectedId = params.get("item") || "";
  let activeCategory = params.get("category") || "";

  const setSelected = (id) => {
    selectedId = id;
    const item = window.BYTIData.getItemById(id);
    selectedLabel.textContent = item ? `Selected: ${item.name}` : "No item selected yet.";
    document.querySelectorAll("[data-item-id]").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.dataset.itemId === id);
    });
    if (item) window.BYTIStorage.addRecentItem({ id: item.id, name: item.name, category: item.category });
  };

  const renderItems = (list) => {
    if (!list.length) {
      itemGrid.innerHTML = `
        <div class="empty-state">
          <h3>We couldn't find that item.</h3>
          <p>Try another name or choose a category.</p>
        </div>`;
      return;
    }
    itemGrid.innerHTML = list
      .map(
        (item) => `
      <button class="select-card ${item.id === selectedId ? "is-selected" : ""}" type="button" data-item-id="${item.id}">
        <strong>${item.name}</strong>
        <span>${item.category} · ${item.material}</span>
      </button>`
      )
      .join("");
  };

  categoryGrid.innerHTML = window.BYTIData.CATEGORIES.map(
    (cat) => `
    <button class="category-chip ${cat.id === activeCategory ? "is-selected" : ""}" type="button" data-category="${cat.id}">
      <i class="bi ${cat.icon}" aria-hidden="true"></i>
      ${cat.name}
    </button>`
  ).join("");

  const applyFilters = () => {
    let list = window.BYTIData.ITEMS;
    const q = searchInput.value.trim();
    if (q) list = window.BYTIData.searchItems(q);
    if (activeCategory) list = list.filter((item) => item.category === activeCategory);
    renderItems(list);
    if (selectedId) setSelected(selectedId);
  };

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    const matches = q ? window.BYTIData.searchItems(q).slice(0, 6) : [];
    suggestBox.hidden = !matches.length;
    suggestBox.innerHTML = matches
      .map((item) => `<button type="button" role="option" data-suggest="${item.id}">${item.name}</button>`)
      .join("");
    applyFilters();
  });

  suggestBox.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-suggest]");
    if (!btn) return;
    const item = window.BYTIData.getItemById(btn.dataset.suggest);
    searchInput.value = item.name;
    suggestBox.hidden = true;
    activeCategory = item.category;
    setSelected(item.id);
    applyFilters();
  });

  categoryGrid.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-category]");
    if (!btn) return;
    activeCategory = activeCategory === btn.dataset.category ? "" : btn.dataset.category;
    categoryGrid.querySelectorAll("[data-category]").forEach((chip) => {
      chip.classList.toggle("is-selected", chip.dataset.category === activeCategory);
    });
    applyFilters();
  });

  itemGrid.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-item-id]");
    if (!btn) return;
    setSelected(btn.dataset.itemId);
  });

  if (params.get("q")) searchInput.value = params.get("q");
  applyFilters();
  if (selectedId) setSelected(selectedId);

  document.getElementById("check-item-form").addEventListener("submit", (event) => {
    event.preventDefault();
    formError.hidden = true;
    const condition = page.querySelector('input[name="condition"]:checked');
    const preference = page.querySelector('input[name="preference"]:checked');
    if (!selectedId) {
      formError.hidden = false;
      formError.textContent = "Please choose an item before continuing.";
      return;
    }
    if (!condition) {
      formError.hidden = false;
      formError.textContent = "Please select an item condition before continuing.";
      return;
    }
    const item = window.BYTIData.getItemById(selectedId);
    window.BYTIStorage.addRecentSearch(item.name);
    window.BYTIStorage.setCurrentCheck({
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      condition: condition.value,
      preference: preference ? preference.value : "not-sure",
      timestamp: Date.now(),
    });
    window.location.href = BYTI.pageUrl("recommendations.html");
  });
};

const initRecommendations = () => {
  const page = document.getElementById("recommendations-page");
  if (!page) return;
  const check = window.BYTIStorage.getCurrentCheck();
  const heading = document.getElementById("rec-heading");
  const summary = document.getElementById("rec-summary");
  const list = document.getElementById("rec-list");

  if (!check) {
    heading.textContent = "No item selected yet.";
    summary.textContent = "Start from Check an Item to get tailored next steps.";
    list.innerHTML = `<div class="empty-state"><a class="btn btn-brand" href="${BYTI.pageUrl("check-item.html")}">Check an Item</a></div>`;
    return;
  }

  const item = window.BYTIData.getItemById(check.itemId);
  heading.textContent = `Don't throw away your ${item.name.toLowerCase()} yet!`;
  summary.textContent = `Condition: ${CONDITION_LABELS[check.condition]}. Preference: ${check.preference.replace("-", " ")}. We found several possible next steps.`;

  const recs = buildRecommendations(item, check.condition, check.preference);
  list.innerHTML = recs
    .map(
      (rec, index) => `
    <article class="rec-card" style="animation-delay:${index * 70}ms">
      <div class="rec-icon"><i class="bi ${rec.icon}" aria-hidden="true"></i></div>
      <div class="rec-body">
        <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
          <span class="pill">Priority ${index + 1}</span>
          <span class="pill subtle">${rec.difficulty}</span>
          <span class="pill subtle">${rec.effort}</span>
        </div>
        <h3>${rec.title}</h3>
        <p>${rec.description}</p>
        <p class="impact-note">${rec.impactNote}</p>
        <details>
          <summary>Why this recommendation?</summary>
          <p>${rec.why}</p>
        </details>
        <div class="rec-actions">
          <button class="btn btn-brand" type="button" data-complete='${JSON.stringify({
            itemId: item.id,
            itemName: item.name,
            action: rec.action,
            grams: rec.grams,
          })}'>I chose this</button>
          <button class="btn btn-outline-brand" type="button" data-save-rec='${JSON.stringify({
            id: `${item.id}-${rec.action}`,
            name: `${item.name} · ${rec.title}`,
            category: item.category,
            action: rec.action,
          })}'>Save</button>
          ${
            rec.action === "upcycle"
              ? `<a class="btn btn-ghost" href="${BYTI.pageUrl("diy.html")}?item=${item.id}">View DIY ideas</a>`
              : ""
          }
          ${
            ["recycle", "donate", "repair"].includes(rec.action)
              ? `<a class="btn btn-ghost" href="${BYTI.pageUrl("find-place.html")}?type=${
                  rec.action === "repair" ? "repair" : rec.action === "donate" ? "donation" : item.category === "electronics" ? "e-waste" : "recycling"
                }">Find a place</a>`
              : ""
          }
        </div>
      </div>
    </article>`
    )
    .join("");

  list.addEventListener("click", (event) => {
    const complete = event.target.closest("[data-complete]");
    const save = event.target.closest("[data-save-rec]");
    if (complete) {
      const payload = JSON.parse(complete.dataset.complete);
      window.BYTIStorage.saveAction(payload);
      BYTI.toast("Action added to your impact dashboard.");
      document.getElementById("impact-flash").hidden = false;
      document.getElementById("impact-flash-text").textContent =
        payload.action === "recycle" && item.material === "electronics"
          ? "DEMO estimate: responsible e-waste diversion."
          : `DEMO estimate: about ${payload.grams} g of waste avoided.`;
      document.getElementById("impact-flash").classList.add("is-visible");
    }
    if (save) {
      window.BYTIStorage.saveRecommendation(JSON.parse(save.dataset.saveRec));
      BYTI.toast("Idea saved successfully!");
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initCheckItem();
  initRecommendations();
});
