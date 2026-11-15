"use strict";

// Use roving tabindex and automatic activation for the local, instant panels.
const portfolioTabs = Array.from(document.querySelectorAll('.portfolio-tabs [role="tab"]'));

function activatePortfolioTab(selectedTab) {
  portfolioTabs.forEach((tab) => {
    const isSelected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !isSelected;
  });
}

portfolioTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activatePortfolioTab(tab));
  tab.addEventListener("focus", () => activatePortfolioTab(tab));
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
    portfolioTabs[nextIndex].focus();
  });
});
