const NAV_ATTRIBUTE = "data-nav";
const PAGE_ATTRIBUTE = "data-page";

function getHashPageId() {
  const raw = window.location.hash.replace(/^#/, "").trim();
  return raw || null;
}

function getNavTargets() {
  return Array.from(document.querySelectorAll(`[${NAV_ATTRIBUTE}]`));
}

function getPages() {
  return Array.from(document.querySelectorAll(`[${PAGE_ATTRIBUTE}]`));
}

function pageExists(pageId) {
  return getPages().some((page) => page.id === pageId);
}

function setActivePage(pageId, { updateHash = true } = {}) {
  const pages = getPages();
  const navTargets = getNavTargets();

  for (const page of pages) {
    const isActive = page.id === pageId;
    page.classList.toggle("is-active", isActive);
    page.hidden = !isActive;
  }

  for (const el of navTargets) {
    const target = el.getAttribute(NAV_ATTRIBUTE);
    const isActive = target === pageId;

    if (el.getAttribute("role") === "tab") {
      el.setAttribute("aria-selected", String(isActive));
      el.tabIndex = isActive ? 0 : -1;
    }

    el.classList.toggle("is-active", isActive);
  }

  if (updateHash) {
    const next = new URL(window.location.href);
    next.hash = `#${pageId}`;
    window.history.replaceState(null, "", next);
  }
}

export function initNavigation({ defaultPage = "home" } = {}) {
  const pages = getPages();
  if (pages.length === 0) return;

  for (const page of pages) {
    if (!page.id) {
      throw new Error("Each page section must have an id.");
    }
  }

  for (const button of getNavTargets()) {
    button.addEventListener("click", () => {
      const target = button.getAttribute(NAV_ATTRIBUTE);
      if (!target || !pageExists(target)) return;
      setActivePage(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  window.addEventListener("hashchange", () => {
    const pageId = getHashPageId();
    if (!pageId || !pageExists(pageId)) return;
    setActivePage(pageId, { updateHash: false });
  });

  const initial = getHashPageId();
  if (initial && pageExists(initial)) {
    setActivePage(initial, { updateHash: false });
    return;
  }

  setActivePage(defaultPage, { updateHash: true });
}

