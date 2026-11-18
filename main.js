/**
 * Shared UI: navigation state, search overlay, toasts, footer modals, counters, fade-ins.
 */
const BYTI = {
  toast(message) {
    const region = document.getElementById("toast-region");
    if (!region) return;
    const el = document.createElement("div");
    el.className = "byti-toast";
    el.setAttribute("role", "status");
    el.innerHTML = `<i class="bi bi-check-circle-fill" aria-hidden="true"></i><span>${message}</span>`;
    region.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-visible"));
    setTimeout(() => {
      el.classList.remove("is-visible");
      setTimeout(() => el.remove(), 300);
    }, 2800);
  },

  asset(pathFromRoot) {
    const root = document.body?.dataset.root || ".";
    return `${root}/${pathFromRoot}`.replace(/\/{2,}/g, "/").replace(":/", "://");
  },

  pageUrl(file) {
    const root = document.body?.dataset.root || ".";
    if (file === "index.html") return root === "." ? "index.html" : "../index.html";
    return root === "." ? `pages/${file}` : file;
  },

  formatDate(iso) {
    const date = new Date(`${iso}T00:00:00`);
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  },

  animateCounters(scope = document) {
    scope.querySelectorAll("[data-count]").forEach((el) => {
      const target = Number(el.dataset.count);
      const decimals = Number(el.dataset.decimals || 0);
      const suffix = el.dataset.suffix || "";
      const duration = 1200;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 3;
        el.textContent = `${(target * eased).toFixed(decimals)}${suffix}`;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  },
};

window.BYTI = BYTI;

const highlightNav = () => {
  const page = document.body.dataset.page;
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === page) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
};

const initGlobalSearch = () => {
  const form = document.getElementById("global-search-form");
  const input = document.getElementById("global-search-input");
  const results = document.getElementById("global-search-results");
  if (!form || !input || !results || !window.BYTIData) return;

  const render = (items) => {
    if (!items.length) {
      results.innerHTML = `<p class="empty-copy mb-0">No ideas found. Try another name or choose a category.</p>`;
      return;
    }
    results.innerHTML = items
      .slice(0, 8)
      .map(
        (item) => `
        <a class="search-result" href="${BYTI.pageUrl("check-item.html")}?item=${encodeURIComponent(item.id)}">
          <i class="bi bi-search" aria-hidden="true"></i>
          <span>
            <strong>${item.name}</strong>
            <small>${item.category} · ${item.material}</small>
          </span>
        </a>`
      )
      .join("");
  };

  input.addEventListener("input", () => {
    const q = input.value.trim();
    render(q ? window.BYTIData.searchItems(q) : window.BYTIData.ITEMS.slice(0, 6));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    window.BYTIStorage.addRecentSearch(q);
    const matches = window.BYTIData.searchItems(q);
    if (matches.length === 1) {
      window.location.href = `${BYTI.pageUrl("check-item.html")}?item=${encodeURIComponent(matches[0].id)}`;
      return;
    }
    window.location.href = `${BYTI.pageUrl("check-item.html")}?q=${encodeURIComponent(q)}`;
  });

  render(window.BYTIData.ITEMS.slice(0, 6));
};

const initFadeIns = () => {
  const nodes = document.querySelectorAll(".fade-in");
  if (!nodes.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  nodes.forEach((node) => io.observe(node));
};

const initHome = () => {
  if (document.body.dataset.page !== "home") return;
  BYTI.animateCounters();

  const track = document.querySelector("[data-transform-track]");
  if (track) {
    const frames = [
      { from: "Old jeans", to: "Tote bag" },
      { from: "Glass jar", to: "Storage" },
      { from: "Plastic bottle", to: "Plant pot" },
      { from: "Cardboard box", to: "Organiser" },
    ];
    let i = 0;
    const fromEl = track.querySelector("[data-from]");
    const toEl = track.querySelector("[data-to]");
    setInterval(() => {
      i = (i + 1) % frames.length;
      track.classList.add("is-switching");
      setTimeout(() => {
        fromEl.textContent = frames[i].from;
        toEl.textContent = frames[i].to;
        track.classList.remove("is-switching");
      }, 280);
    }, 3200);
  }
};

const initLearn = () => {
  const grid = document.getElementById("learn-grid");
  if (!grid || !window.BYTIData) return;
  const modalEl = document.getElementById("learnModal");
  const modal = modalEl ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;

  grid.innerHTML = window.BYTIData.LEARN_ARTICLES.map(
    (article) => `
    <article class="col-md-6 col-xl-3">
      <button class="content-card learn-card h-100" type="button" data-article="${article.id}">
        <span class="eyebrow">Waste, Explained</span>
        <h3>${article.title}</h3>
        <p>${article.excerpt}</p>
        <span class="stretched-link-label">Read article</span>
      </button>
    </article>`
  ).join("");

  grid.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-article]");
    if (!btn) return;
    const article = window.BYTIData.LEARN_ARTICLES.find((item) => item.id === btn.dataset.article);
    if (!article || !modalEl) return;
    modalEl.querySelector(".modal-title").textContent = article.title;
    modalEl.querySelector(".modal-body").textContent = article.body;
    modal.show();
  });
};

const initSaved = () => {
  const page = document.getElementById("saved-page");
  if (!page) return;

  const paint = () => {
    const { diy, recommendations, recentlyViewed } = window.BYTIStorage.getSavedItems();

    const renderList = (targetId, items, empty, onRemoveAttr) => {
      const el = document.getElementById(targetId);
      if (!items.length) {
        el.innerHTML = `<div class="empty-state compact"><h3>${empty.title}</h3><p>${empty.body}</p></div>`;
        return;
      }
      el.innerHTML = items
        .map(
          (item) => `
      <article class="saved-card">
        <div>
          <h3>${item.name || item.title}</h3>
          <p>${item.category || "Idea"} · ${item.action || item.newPurpose || "Viewed"}</p>
        </div>
        <div class="saved-actions">
          <a class="btn btn-sm btn-outline-brand" href="${item.href}">View</a>
          ${
            item.locked
              ? ""
              : `<button class="btn btn-sm btn-ghost" type="button" ${onRemoveAttr}="${item.id}">Remove</button>`
          }
        </div>
      </article>`
        )
        .join("");
    };

    renderList(
      "saved-diy",
      diy.map((item) => ({
        ...item,
        href: `${BYTI.pageUrl("diy.html")}?idea=${encodeURIComponent(item.id)}`,
      })),
      { title: "No DIY ideas saved yet.", body: "Open the DIY library and tap Save on anything you want to try." },
      "data-remove-diy"
    );

    renderList(
      "saved-recs",
      recommendations.map((item) => ({
        ...item,
        href: `${BYTI.pageUrl("recommendations.html")}`,
      })),
      { title: "No recommendations saved yet.", body: "When a next step looks useful, save it from the results page." },
      "data-remove-rec"
    );

    renderList(
      "saved-recent",
      recentlyViewed.map((item) => ({
        ...item,
        name: item.name,
        action: "Recently viewed",
        href: `${BYTI.pageUrl("check-item.html")}?item=${encodeURIComponent(item.id)}`,
        locked: true,
      })),
      { title: "No recently viewed items.", body: "Start with Check an Item to build this list." },
      "data-none"
    );

    const total = diy.length + recommendations.length;
    document.getElementById("saved-empty-global")?.classList.toggle("d-none", total > 0);
  };

  page.addEventListener("click", (event) => {
    const diyBtn = event.target.closest("[data-remove-diy]");
    const recBtn = event.target.closest("[data-remove-rec]");
    if (diyBtn) {
      window.BYTIStorage.removeDiyIdea(diyBtn.dataset.removeDiy);
      BYTI.toast("Removed from saved ideas.");
      paint();
    }
    if (recBtn) {
      window.BYTIStorage.removeRecommendation(recBtn.dataset.removeRec);
      BYTI.toast("Removed from saved ideas.");
      paint();
    }
  });

  paint();
};

const initPlaces = () => {
  const form = document.getElementById("places-form");
  if (!form) return;
  const grid = document.getElementById("places-grid");
  const queryInput = document.getElementById("place-query");
  const filter = document.getElementById("place-filter");
  const typeParam = new URLSearchParams(window.location.search).get("type");
  if (typeParam && [...filter.options].some((opt) => opt.value === typeParam)) {
    filter.value = typeParam;
  }

  const render = () => {
    const q = (queryInput.value || "").trim().toLowerCase();
    const type = filter.value;
    let places = window.BYTIData.DEMO_PLACES;
    if (type !== "all") places = places.filter((place) => place.type === type);
    if (q) {
      places = places.filter((place) =>
        `${place.city} ${place.pin} ${place.name} ${place.address}`.toLowerCase().includes(q)
      );
    }
    if (!places.length) {
      grid.innerHTML = `<div class="empty-state"><h3>No places found.</h3><p>Try another city, PIN code, or filter. Demo locations only — real maps can be connected later.</p></div>`;
      return;
    }
    grid.innerHTML = places
      .map(
        (place) => `
      <article class="col-md-6 col-xl-4">
        <div class="content-card h-100">
          <div class="d-flex justify-content-between gap-2">
            <span class="pill">${place.type}</span>
            <span class="status-dot ${place.open ? "is-open" : "is-closed"}">${place.open ? "Open" : "Closed"}</span>
          </div>
          <h3 class="mt-3">${place.name}</h3>
          <p class="mb-2">${place.distance} · ${place.city}</p>
          <p class="mb-1"><strong>Accepts:</strong> ${place.accepted}</p>
          <p class="mb-3">${place.address}</p>
          <button class="btn btn-outline-brand" type="button" data-place="${place.id}">View details</button>
        </div>
      </article>`
      )
      .join("");
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });
  filter.addEventListener("change", render);
  render();

  const modalEl = document.getElementById("placeModal");
  const modal = modalEl ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;
  grid.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-place]");
    if (!btn) return;
    const place = window.BYTIData.DEMO_PLACES.find((item) => item.id === btn.dataset.place);
    if (!place || !modalEl) return;
    modalEl.querySelector(".modal-title").textContent = place.name;
    modalEl.querySelector(".modal-body").innerHTML = `
      <p><strong>Type:</strong> ${place.type}</p>
      <p><strong>Address:</strong> ${place.address}</p>
      <p><strong>Hours:</strong> ${place.hours}</p>
      <p><strong>Accepted items:</strong> ${place.accepted}</p>
      <p class="mb-0 text-muted">Demo location — a maps API can be connected in the backend phase.</p>`;
    modal.show();
  });
};

document.addEventListener("DOMContentLoaded", () => {
  highlightNav();
  initGlobalSearch();
  initFadeIns();
  initHome();
  initLearn();
  initSaved();
  initPlaces();
});
