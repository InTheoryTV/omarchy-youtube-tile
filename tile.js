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
    .ytp-size-button,
    .yt-tile-crt-button {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      width: 36px !important;
      min-width: 36px !important;
      height: 36px !important;
    }
    .yt-tile-crt-button {
      color: #fff !important;
      background: transparent !important;
      border: 0 !important;
      padding: 0 !important;
      cursor: pointer !important;
    }
    .ytp-right-controls {
      overflow: visible !important;
    }
    .yt-tile-crt-button {
      flex: 0 0 auto !important;
      overflow: visible !important;
      z-index: 5 !important;
    }
    .yt-tile-crt-button,
    .yt-tile-crt-button[aria-pressed="false"],
    .yt-tile-crt-button[aria-pressed="true"] {
      opacity: 1 !important;
      color: #fff !important;
    }
    .yt-tile-crt-button[aria-pressed="true"] {
      background: rgba(255, 255, 255, 0.22) !important;
      border-radius: 4px !important;
    }
    .yt-tile-crt-button svg {
      width: 22px !important;
      height: 22px !important;
      display: block !important;
      fill: #fff !important;
      stroke: none !important;
      stroke-width: 2 !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
      pointer-events: none !important;
    }
  `;

  const CRT_CSS = `
    .yt-tile-crt-overlay {
      position: absolute !important;
      inset: 0 !important;
      z-index: 1 !important;
      pointer-events: none !important;
      background:
        repeating-linear-gradient(
          to bottom,
          transparent 0 2px,
          rgba(0, 0, 0, 0.2) 2px 3px
        ),
        linear-gradient(
          115deg,
          rgba(255, 255, 255, 0.16) 0%,
          rgba(255, 255, 255, 0.03) 24%,
          transparent 42%
        ),
        radial-gradient(
          ellipse at center,
          transparent 52%,
          rgba(0, 0, 0, 0.42) 100%
        ) !important;
      animation: yt-tile-crt-jiggle 0.1s steps(2, end) infinite !important;
    }
    .yt-tile-crt-overlay::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      height: 16%;
      top: -16%;
      background: linear-gradient(
        to bottom,
        transparent,
        rgba(255, 255, 255, 0.14),
        transparent
      );
      animation: yt-tile-crt-track 8s linear infinite;
    }
    @keyframes yt-tile-crt-track {
      from { top: -16%; }
      to { top: 100%; }
    }
    @keyframes yt-tile-crt-jiggle {
      0% { transform: translate(0, 0); filter: brightness(1); }
      50% { transform: translate(1px, -1px); filter: brightness(1.05); }
      100% { transform: translate(-1px, 0); filter: brightness(0.97); }
    }
    .html5-video-container {
      z-index: 0 !important;
    }
    .yt-tile-crt-overlay {
      z-index: 2 !important;
    }
  `;

  const CRT_LIFT_CSS = `
    video.html5-main-video,
    video.video-stream {
      transform: translate3d(0, 0, 0) !important;
      opacity: 0.999 !important;
    }
    .ytp-chrome-bottom,
    .ytp-chrome-top,
    .ytp-gradient-bottom,
    .ytp-gradient-top,
    .ytp-caption-window-container,
    .ytp-ad-module {
      z-index: 30 !important;
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

  const CRT_KEY = "yt-tile-crt";

  function crtOn() {
    try {
      return localStorage.getItem(CRT_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setCrt(on) {
    try {
      localStorage.setItem(CRT_KEY, on ? "1" : "0");
    } catch (e) {}
  }

  function paintWhite(el) {
    el.style.setProperty("fill", "#ffffff", "important");
    el.style.setProperty("stroke", "none", "important");
    el.style.setProperty("color", "#ffffff", "important");
  }

  function tvIcon() {
    // Tabler Icons, MIT. Filled device-tv-old: rabbit-ear antenna on a CRT.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("data-crt-filled", "1");
    for (const d of [
      "M8.707 2.293l3.293 3.292 3.293-3.292a1 1 0 0 1 1.414 1.414L14.414 6H19a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h4.586L7.293 3.707a1 1 0 0 1 1.414-1.414z",
      "M16 8h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z",
      "M18 11.2a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6z",
      "M18 14.2a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6z",
    ]) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "#ffffff");
      paintWhite(path);
      svg.appendChild(path);
    }
    paintWhite(svg);
    svg.style.setProperty("display", "block", "important");
    svg.style.setProperty("width", "22px", "important");
    svg.style.setProperty("height", "22px", "important");
    return svg;
  }

  function ensureCrtButton(btn) {
    if (!onWatchPage()) return;
    const parent = btn.parentElement;
    if (!parent) return;
    let crt = parent.querySelector(":scope > .yt-tile-crt-button");
    if (crt && crt.nextElementSibling !== btn) {
      btn.insertAdjacentElement("beforebegin", crt);
    }
    if (!crt) {
      crt = document.createElement("button");
      crt.type = "button";
      crt.className = "ytp-button yt-tile-crt-button";
      crt.setAttribute("aria-label", "CRT");
      crt.title = "CRT";
      crt.appendChild(tvIcon());
      crt.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCrt(!crtOn());
        apply();
      });
      btn.insertAdjacentElement("beforebegin", crt);
    }
    crt.setAttribute("aria-label", "CRT");
    crt.title = "CRT";
    if (!crt.querySelector("svg[data-crt-filled]")) {
      crt.replaceChildren(tvIcon());
    }
    crt.setAttribute("aria-pressed", crtOn() ? "true" : "false");
  }

  function directChild(parent, selector) {
    if (!parent || !parent.querySelectorAll) return null;
    for (const el of parent.querySelectorAll(selector)) {
      if (el.parentNode === parent) return el;
    }
    return null;
  }

  function liftVideo(video, show) {
    if (!video) return;
    if (!show) {
      for (const prop of ["transform", "opacity", "filter", "z-index"]) {
        video.style.removeProperty(prop);
      }
      return;
    }
    video.style.setProperty("position", "absolute", "important");
    video.style.setProperty("z-index", "0", "important");
    video.style.setProperty("transform", "translate3d(0,0,0)", "important");
    video.style.setProperty("opacity", "0.999", "important");
    video.style.setProperty("filter", "contrast(1.08) saturate(1.15)", "important");
  }

  function mountOverlay(video, show) {
    const parent = video && video.parentElement;
    if (!parent) return;
    liftVideo(video, show);
    let overlay = directChild(parent, ".yt-tile-crt-overlay");
    if (!show) {
      if (overlay) overlay.remove();
      return;
    }
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "yt-tile-crt-overlay";
      parent.appendChild(overlay);
    }
    overlay.style.cssText = [
      "position:absolute",
      "inset:0",
      "width:100%",
      "height:100%",
      "z-index:4",
      "pointer-events:none",
      "background-image:repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,0.55) 2px 3px), linear-gradient(115deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 18%, transparent 40%), radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.62) 100%)",
      "background-size:auto, auto, auto",
      "animation:yt-tile-crt-jiggle 0.1s steps(2, end) infinite",
    ].join(";");
  }

  function paintCrt(show) {
    const roots = [document];
    if (document.documentElement) {
      walkShadows(document.documentElement, (node) => {
        if (node instanceof ShadowRoot) roots.push(node);
      });
    }
    for (const root of roots) {
      if (!root.querySelectorAll) continue;
      for (const video of root.querySelectorAll("video.html5-main-video")) {
        mountOverlay(video, show);
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
    const crt = onWatchPage() && crtOn();
    document.documentElement.classList.toggle("yt-tile", on);
    document.documentElement.classList.toggle("yt-crt", crt);
    paintCrt(crt);
    const start = watchEl();
    if (!start) return;
    for (const btn of start.querySelectorAll(".ytp-size-button")) {
      armButton(btn);
      ensureCrtButton(btn);
    }
    walkShadows(start, (node) => {
      if (!(node instanceof ShadowRoot)) return;
      if (!node.querySelector("#movie_player, video, .ytp-size-button")) return;
      putStyle(node, BUTTON_ID, BUTTON_CSS);
      putStyle(node, "yt-tile-crt", CRT_CSS);
      putStyle(node, FILL_ID, on ? FILL_CSS : null);
      putStyle(node, "yt-tile-crt-lift", crt ? CRT_LIFT_CSS : null);
      for (const btn of node.querySelectorAll(".ytp-size-button")) {
        armButton(btn);
        ensureCrtButton(btn);
      }
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

  // YouTube builds the control bar late, and rebuilds it during playback.
  // The short startup pass misses that, so keep putting the button back.
  setInterval(apply, 1000);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", kick, { once: true });
  } else {
    kick();
  }
})();
