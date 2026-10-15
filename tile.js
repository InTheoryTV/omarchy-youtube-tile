/* The player UI lives in a shadow root, so the stylesheet cannot reach the
   video or the theater button. This script injects those rules there. */
(function () {
  // Only the Omarchy webapp (Chromium --app window) gets the tile. A normal
  // browser tab keeps YouTube's own theater mode, including search and scrolling.
  const appWindow =
    window.matchMedia("(display-mode: standalone), (display-mode: minimal-ui)").matches ||
    (window.locationbar && window.locationbar.visible === false);
  if (!appWindow) return;

  const FILL_ID = "yt-tile-fill";
  const BUTTON_ID = "yt-tile-button";
  const armed = new WeakSet();

  const BUTTON_CSS = `
    .ytp-size-button {
      display: inline-flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }
  `;

  const FILL_CSS = `
    #movie_player,
    .html5-video-player {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      background: #000 !important;
    }
    .html5-video-container,
    video.html5-main-video,
    video.video-stream {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      left: 0 !important;
      top: 0 !important;
      margin: 0 !important;
      transform: none !important;
      object-fit: cover !important;
      object-position: center center !important;
    }
    .ytp-chrome-bottom,
    .ytp-chrome-top,
    .ytp-gradient-bottom,
    .ytp-gradient-top,
    .ytp-caption-window-container {
      z-index: 2 !important;
    }
    .ytp-pause-overlay,
    .ytp-endscreen-content,
    .ytp-ce-element,
    .ytp-suggested-action,
    .ytp-upnext,
    .ytp-watermark {
      display: none !important;
    }
  `;

  function shadowOf(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el.shadowRoot) return el.shadowRoot;
    try {
      return chrome.dom && chrome.dom.openOrClosedShadowRoot(el);
    } catch (e) {
      return null;
    }
  }

  function watchEl() {
    return document.querySelector("ytd-watch-flexy, ytd-watch-grid");
  }

  function onWatchPage() {
    const path = location.pathname;
    return path === "/watch" || path.startsWith("/live/");
  }

  function tileOn() {
    // YouTube keeps the theater flag on the watch element even on Home.
    // The fill belongs on a watch page only, so Home can scroll and search.
    if (!onWatchPage()) return false;
    const el = watchEl();
    if (!el || el.hasAttribute("fullscreen") || document.fullscreenElement) return false;
    return el.hasAttribute("theater") || el.hasAttribute("data-yt-tile");
  }

  function putStyle(root, id, css) {
    let style = root.querySelector("#" + id);
    if (!css) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      root.appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }

  function walkShadows(start, visit) {
    const stack = [start];
    const seen = new Set();
    while (stack.length) {
      const node = stack.pop();
      if (!node || seen.has(node) || !node.querySelectorAll) continue;
      seen.add(node);
      visit(node);
      for (const el of node.querySelectorAll("*")) {
        const sr = shadowOf(el);
        if (sr) stack.push(sr);
      }
    }
  }

  function armButton(btn) {
    if (armed.has(btn)) return;
    armed.add(btn);
    btn.addEventListener("click", () => {
      const wasTheater = !!watchEl()?.hasAttribute("theater");
      setTimeout(() => {
        const el = watchEl();
        if (!el || el.hasAttribute("fullscreen")) return;
        if (el.hasAttribute("theater") !== wasTheater) {
          el.removeAttribute("data-yt-tile");
        } else {
          el.toggleAttribute("data-yt-tile");
        }
        apply();
      }, 300);
    });
  }

  let bound = null;
  function bind() {
    const el = watchEl();
    if (!el || el === bound) return;
    bound = el;
  }

  const attrWatch = new MutationObserver(apply);
  function watchAttributes() {
    const root = document.documentElement;
    if (!root) return;
    attrWatch.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ["theater", "fullscreen", "data-yt-tile"],
    });
  }

  function apply() {
    bind();
    const on = tileOn();
    document.documentElement.classList.toggle("yt-tile", on);
    const start = watchEl();
    if (!start) return;
    for (const btn of start.querySelectorAll(".ytp-size-button")) armButton(btn);
    walkShadows(start, (node) => {
      if (!(node instanceof ShadowRoot)) return;
      if (!node.querySelector("#movie_player, video, .ytp-size-button")) return;
      putStyle(node, BUTTON_ID, BUTTON_CSS);
      putStyle(node, FILL_ID, on ? FILL_CSS : null);
      for (const btn of node.querySelectorAll(".ytp-size-button")) armButton(btn);
    });
  }

  let kickTimer = null;
  function kick() {
    apply();
    let n = 0;
    if (kickTimer) clearInterval(kickTimer);
    kickTimer = setInterval(() => {
      apply();
      if (++n >= 24) {
        clearInterval(kickTimer);
        kickTimer = null;
      }
    }, 250);
  }

  watchAttributes();
  document.addEventListener("yt-navigate-finish", () => {
    bound = null;
    kick();
  });
  document.addEventListener("fullscreenchange", apply);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", kick, { once: true });
  } else {
    kick();
  }
})();
