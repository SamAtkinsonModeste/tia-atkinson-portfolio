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

// A single Bootstrap modal shares one ordered collection across both galleries.
const lightboxElement = document.getElementById("portfolio-lightbox");
const lightbox = bootstrap.Modal.getOrCreateInstance(lightboxElement);
const lightboxStage = document.getElementById("lightbox-stage");
const lightboxTriggers = Array.from(document.querySelectorAll("[data-lightbox-index]"))
  .sort((a, b) => Number(a.dataset.lightboxIndex) - Number(b.dataset.lightboxIndex));
const lightboxItems = lightboxTriggers.map((trigger) => {
  const project = trigger.closest("section");
  const image = trigger.querySelector("img");
  const video = project.querySelector("video");
  return {
    trigger,
    image,
    reference: project.querySelector("img.art-project__reference"),
    video: image ? null : video,
    title: trigger.getAttribute("aria-label").replace(/^Enlarge /, ""),
    category: image ? "Visual Art" : "Film Animation",
    description: project.querySelector("figcaption p, .film-project__description")
  };
});
let lightboxIndex = 0;
let lightboxOpener;
let backgroundInertState = [];

function resetLightboxVideo() {
  const video = lightboxStage.querySelector("video");
  if (!video) return;
  video.pause();
  try {
    video.currentTime = 0;
  } catch {
    // Seeking can be unavailable before video metadata has loaded.
  }
  video.removeAttribute("src");
  video.querySelectorAll("source").forEach((source) => source.remove());
  video.load();
}

function displayLightboxItem(index) {
  resetLightboxVideo();
  lightboxIndex = (index + lightboxItems.length) % lightboxItems.length;
  const item = lightboxItems[lightboxIndex];
  const media = document.createElement(item.reference ? "div" : item.image ? "img" : "video");
  media.className = item.reference ? "lightbox-composition" : "lightbox-media";
  if (item.reference) {
    // Treat the overlapping portrait pair as one item, without cloning its button.
    [item.reference, item.image].forEach((original, index) => {
      const image = original.cloneNode(true);
      image.className = index === 0 ? "lightbox-composition__reference" : "lightbox-composition__drawing";
      image.loading = "eager";
      media.append(image);
    });
  } else if (item.image) {
    media.src = item.image.getAttribute("src");
    media.alt = item.image.alt;
    media.decoding = "async";
  } else {
    media.controls = true;
    media.playsInline = true;
    media.preload = "metadata";
    media.setAttribute("aria-labelledby", "lightbox-title");
    // Clone sources and any future caption tracks, without copying autoplay.
    item.video.querySelectorAll("source, track").forEach((source) => {
      media.append(source.cloneNode(true));
    });
  }
  lightboxStage.replaceChildren(media);
  document.getElementById("lightbox-title").textContent = item.title;
  document.getElementById("lightbox-breadcrumb").textContent = `${item.category} › ${item.title}`;
  document.getElementById("lightbox-counter").textContent = `${lightboxIndex + 1} of ${lightboxItems.length}`;
  document.getElementById("lightbox-description").textContent = item.description?.textContent.trim() || "";
}

lightboxItems.forEach((item, index) => {
  item.trigger.addEventListener("click", () => {
    lightboxOpener = item.trigger;
    document.querySelectorAll(".film-project__video").forEach((video) => video.pause());
    displayLightboxItem(index);
    lightbox.show(item.trigger);
  });
});

document.getElementById("lightbox-previous").addEventListener("click", () => displayLightboxItem(lightboxIndex - 1));
document.getElementById("lightbox-next").addEventListener("click", () => displayLightboxItem(lightboxIndex + 1));

lightboxElement.addEventListener("keydown", (event) => {
  // Leave arrow keys to the native video player whenever it has focus.
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      event.target.closest("video, input, textarea, select, [contenteditable], [role='slider']")) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  displayLightboxItem(lightboxIndex + (event.key === "ArrowRight" ? 1 : -1));
});

lightboxElement.addEventListener("shown.bs.modal", () => {
  // Bootstrap handles the focus trap, Escape and background scroll locking.
  backgroundInertState = Array.from(document.querySelectorAll("body > header, body > main, body > footer"))
    .map((element) => ({ element, inert: element.inert }));
  backgroundInertState.forEach(({ element }) => { element.inert = true; });
  lightboxElement.querySelector(".lightbox-close").focus({ preventScroll: true });
});

lightboxElement.addEventListener("hide.bs.modal", resetLightboxVideo);
lightboxElement.addEventListener("hidden.bs.modal", () => {
  lightboxStage.replaceChildren();
  backgroundInertState.forEach(({ element, inert }) => { element.inert = inert; });
  backgroundInertState = [];
  if (lightboxOpener?.isConnected && !lightboxOpener.closest("[hidden]")) {
    lightboxOpener.focus({ preventScroll: true });
  } else {
    portfolioTabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.focus({ preventScroll: true });
  }
});
