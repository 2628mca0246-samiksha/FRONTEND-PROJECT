const timeBucket = (minutes) => {
  if (minutes <= 15) return "quick";
  if (minutes <= 30) return "short";
  return "longer";
};

const diyIllustration = (key) => {
  const palettes = {
    bottle: ["#7cb518", "#1b4d3e"],
    jeans: ["#3d5a80", "#1b4d3e"],
    jar: ["#c9a227", "#1b4d3e"],
    box: ["#c4a574", "#5c4a32"],
    shirt: ["#7aa2c4", "#1b4d3e"],
    can: ["#8d99ae", "#1b4d3e"],
    vase: ["#6bb3b1", "#1b4d3e"],
    chair: ["#b08968", "#1b4d3e"],
    container: ["#9cc5a1", "#1b4d3e"],
    paper: ["#d6c7a1", "#1b4d3e"],
    food: ["#6a994e", "#1b4d3e"],
  };
  const [a, b] = palettes[key] || palettes.bottle;
  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect width="320" height="200" rx="24" fill="${a}22"/><circle cx="250" cy="46" r="36" fill="${a}55"/><rect x="48" y="58" width="130" height="90" rx="18" fill="${b}"/><rect x="168" y="86" width="86" height="62" rx="14" fill="${a}"/></svg>`;
};

const renderDiyCards = (ideas) => {
  const grid = document.getElementById("diy-grid");
  if (!ideas.length) {
    grid.innerHTML = `<div class="empty-state"><h3>No ideas found.</h3><p>Try changing your filters.</p></div>`;
    return;
  }
  grid.innerHTML = ideas
    .map((idea) => {
      const saved = window.BYTIStorage.isDiySaved(idea.id);
      return `
      <article class="col-md-6 col-xl-4" id="idea-${idea.id}">
        <div class="content-card diy-card h-100">
          <div class="diy-visual">${diyIllustration(idea.image)}</div>
          <h3>${idea.title}</h3>
          <p>${idea.itemUsed} → ${idea.newPurpose}</p>
          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="pill">${idea.difficulty}</span>
            <span class="pill subtle">${idea.timeMinutes} minutes</span>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-brand" type="button" data-steps="${idea.id}">View steps</button>
            <button class="btn btn-outline-brand" type="button" data-save-diy="${idea.id}" aria-pressed="${saved}">${
        saved ? "Saved" : "Save"
      }</button>
          </div>
        </div>
      </article>`;
    })
    .join("");
};

const initDiy = () => {
  const page = document.getElementById("diy-page");
  if (!page) return;

  const search = document.getElementById("diy-search");
  const category = document.getElementById("diy-category");
  const difficulty = document.getElementById("diy-difficulty");
  const time = document.getElementById("diy-time");
  const sort = document.getElementById("diy-sort");
  const params = new URLSearchParams(window.location.search);

  window.BYTIData.CATEGORIES.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    category.appendChild(opt);
  });

  if (params.get("item")) {
    const item = window.BYTIData.getItemById(params.get("item"));
    if (item) search.value = item.name;
  }

  const apply = () => {
    let ideas = [...window.BYTIData.DIY_IDEAS];
    const q = search.value.trim().toLowerCase();
    if (q) {
      ideas = ideas.filter((idea) =>
        `${idea.title} ${idea.itemUsed} ${idea.newPurpose} ${idea.category}`.toLowerCase().includes(q)
      );
    }
    if (category.value !== "all") ideas = ideas.filter((idea) => idea.category === category.value);
    if (difficulty.value !== "all") ideas = ideas.filter((idea) => idea.difficulty === difficulty.value);
    if (time.value !== "all") ideas = ideas.filter((idea) => timeBucket(idea.timeMinutes) === time.value);
    if (sort.value === "time") ideas.sort((a, b) => a.timeMinutes - b.timeMinutes);
    else if (sort.value === "difficulty") {
      const rank = { easy: 1, medium: 2, hard: 3 };
      ideas.sort((a, b) => rank[a.difficulty] - rank[b.difficulty]);
    } else ideas.sort((a, b) => a.title.localeCompare(b.title));
    renderDiyCards(ideas);

    const focusId = params.get("idea");
    if (focusId) {
      const node = document.getElementById(`idea-${focusId}`);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  ["input", "change"].forEach((evt) => {
    search.addEventListener(evt, apply);
    category.addEventListener(evt, apply);
    difficulty.addEventListener(evt, apply);
    time.addEventListener(evt, apply);
    sort.addEventListener(evt, apply);
  });

  document.getElementById("diy-reset").addEventListener("click", () => {
    search.value = "";
    category.value = "all";
    difficulty.value = "all";
    time.value = "all";
    sort.value = "name";
    apply();
  });

  const modalEl = document.getElementById("diyModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  page.addEventListener("click", (event) => {
    const saveBtn = event.target.closest("[data-save-diy]");
    const stepsBtn = event.target.closest("[data-steps]");
    if (saveBtn) {
      const idea = window.BYTIData.DIY_IDEAS.find((item) => item.id === saveBtn.dataset.saveDiy);
      if (window.BYTIStorage.isDiySaved(idea.id)) {
        window.BYTIStorage.removeDiyIdea(idea.id);
        BYTI.toast("Removed from saved ideas.");
      } else {
        window.BYTIStorage.saveDiyIdea({
          id: idea.id,
          name: idea.title,
          title: idea.title,
          category: idea.category,
          action: "upcycle",
          newPurpose: idea.newPurpose,
        });
        BYTI.toast("Idea saved successfully!");
      }
      apply();
    }
    if (stepsBtn) {
      const idea = window.BYTIData.DIY_IDEAS.find((item) => item.id === stepsBtn.dataset.steps);
      modalEl.querySelector(".modal-title").textContent = idea.title;
      modalEl.querySelector(".modal-body").innerHTML = `
        <p><strong>Item used:</strong> ${idea.itemUsed}</p>
        <p><strong>Materials:</strong></p>
        <ul>${idea.materials.map((m) => `<li>${m}</li>`).join("")}</ul>
        <p><strong>Steps:</strong></p>
        <ol>${idea.steps.map((s) => `<li>${s}</li>`).join("")}</ol>`;
      modal.show();
    }
  });

  apply();
};

document.addEventListener("DOMContentLoaded", initDiy);
