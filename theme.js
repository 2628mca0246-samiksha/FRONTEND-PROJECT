/**
 * Applies light/dark theme as early as possible to avoid a flash of the wrong theme.
 * Theme preference is stored via storage.js once that file has loaded.
 */
(() => {
  const KEY = "byti_theme";
  const saved = localStorage.getItem(KEY) || "light";
  document.documentElement.setAttribute("data-theme", saved);
  document.documentElement.setAttribute("data-bs-theme", saved === "dark" ? "dark" : "light");
})();

const initThemeToggle = () => {
  const buttons = document.querySelectorAll("[data-theme-toggle]");
  const apply = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-bs-theme", theme === "dark" ? "dark" : "light");
    if (window.BYTIStorage) window.BYTIStorage.setThemePreference(theme);
    else localStorage.setItem("byti_theme", theme);
    buttons.forEach((btn) => {
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      const icon = btn.querySelector("i");
      const label = btn.querySelector(".theme-label");
      if (icon) icon.className = theme === "dark" ? "bi bi-moon-stars-fill" : "bi bi-sun-fill";
      if (label) label.textContent = theme === "dark" ? "Dark" : "Light";
    });
  };

  apply(document.documentElement.getAttribute("data-theme") || "light");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next);
      if (window.BYTI) {
        window.BYTI.toast(next === "dark" ? "Theme changed to dark mode." : "Theme changed to light mode.");
      }
    });
  });
};

document.addEventListener("DOMContentLoaded", initThemeToggle);
