"use strict";

// Use roving tabindex and automatic activation for the local, instant panels.
const portfolioTabs = Array.from(document.querySelectorAll('.portfolio-tabs [role="tab"]'));
let restoringFragment = false;
let fragmentScrollFrame;

function activatePortfolioTab(selectedTab, updateFragment = false) {
  portfolioTabs.forEach((tab) => {
    const isSelected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !isSelected;
  });

  if (updateFragment && !restoringFragment) {
    cancelAnimationFrame(fragmentScrollFrame);
    const fragment = `#${selectedTab.getAttribute("aria-controls")}`;
    if (window.location.hash !== fragment) {
      // A fragment-only URL preserves the GitHub Pages repository path and query.
      // pushState records tab changes without the browser scrolling to the panel.
      window.history.pushState(null, "", fragment);
    }
  }
}

function restorePortfolioFragment() {
  cancelAnimationFrame(fragmentScrollFrame);
  let targetId;
  try {
    targetId = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return; // Ignore malformed fragments without breaking the tabs.
  }

  const target = targetId ? document.getElementById(targetId) : null;
  const panel = target?.closest('[role="tabpanel"]');
  const selectedTab = panel
    ? portfolioTabs.find((tab) => tab.getAttribute("aria-controls") === panel.id)
    : !targetId ? portfolioTabs[0] : null;
  if (!selectedTab) return;

  // Keep keyboard focus out of a panel that is about to become hidden.
  const focusedPanel = document.activeElement?.closest('[role="tabpanel"]');
  restoringFragment = true;
  activatePortfolioTab(selectedTab);
  if (focusedPanel && focusedPanel.id !== selectedTab.getAttribute("aria-controls")) {
    selectedTab.focus({ preventScroll: true });
  }
  restoringFragment = false;

  if (panel && target !== panel) {
    // A deep link may initially point into a hidden panel. Reveal it before scrolling.
    fragmentScrollFrame = requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start" });
    });
  }
}

portfolioTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activatePortfolioTab(tab, true));
  tab.addEventListener("focus", () => activatePortfolioTab(tab, true));
  tab.addEventListener("keydown", (event) => {
    let nextIndex;

    switch (event.key) {
      case "ArrowLeft":
        nextIndex = (index - 1 + portfolioTabs.length) % portfolioTabs.length;
        break;
      case "ArrowRight":
        nextIndex = (index + 1) % portfolioTabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = portfolioTabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    portfolioTabs[nextIndex].focus({ preventScroll: true });
  });
});

window.addEventListener("hashchange", restorePortfolioFragment);
window.addEventListener("popstate", restorePortfolioFragment);
restorePortfolioFragment();
