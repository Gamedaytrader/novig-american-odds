/*
 * American Odds for Novig
 * -----------------------
 * Novig prices markets as implied-probability percentages. This content script
 * finds every percentage on the page and appends the equivalent American odds.
 *
 * Design notes:
 *  - Nothing inside Novig's React tree is inserted, removed or rewritten. The
 *    label is drawn with a CSS ::after pseudo-element fed by a data attribute,
 *    which React's reconciler leaves alone and which cannot break the app.
 *  - Two kinds of price display are handled: plain text ("44%") and Novig's
 *    animated odometer reels, where the visible digit is found geometrically.
 */

(() => {
  "use strict";

  const ATTR = "data-novig-ao";
  const REEL_ATTR = "data-novig-ao-reel";
  const FIT_ATTR = "data-novig-ao-fit";
  const TRAILING_PCT = /(\d{1,3}(?:\.\d+)?)\s*%$/;
  const TICK_MS = 900;      // reels animate via CSS transforms, so poll them
  const DEBOUNCE_MS = 250;   // coalesce bursts of React re-renders
  const RESCAN_MS = 1500;    // how often the reel search is allowed to re-run

  let enabled = true;
  let started = false;
  let observer = null;
  let ticker = null;
  let queued = false;
  let reelGroups = null;
  let lastDiscovery = 0;

  /* ------------------------------------------------------------------ math */

  // Implied probability (as a percent) -> American moneyline odds.
  //   p >= 50%  ->  favourite,  -(100p / (100 - p))
  //   p <  50%  ->  underdog,   +(100(100 - p) / p)
  function toAmericanOdds(pct) {
    const p = pct / 100;
    if (!isFinite(p) || p <= 0 || p >= 1) return null;
    const value = p >= 0.5 ? -(100 * p) / (1 - p) : (100 * (1 - p)) / p;
    const rounded = Math.round(value);
    if (!isFinite(rounded) || rounded === 0) return null;
    return (rounded > 0 ? "+" : "") + rounded;
  }

  function labelFor(pct) {
    const odds = toAmericanOdds(pct);
    return odds === null ? null : "(" + odds + ")";
  }

  /* ------------------------------------------------------------------- fit */

  // Some Novig prices sit in narrow, clipped pills (the Trending Futures rail,
  // for example). Where the label would be cut off, fall back to a shorter and
  // then a smaller form so the odds stay readable instead of half-hidden.
  const fitCache = new WeakMap();

  function clippingAncestor(el) {
    let p = el.parentElement;
    for (let i = 0; i < 6 && p && p !== document.body; i++) {
      if (getComputedStyle(p).overflowX !== "visible") return p;
      p = p.parentElement;
    }
    return null;
  }

  function applyLabel(el, odds) {
    const cached = fitCache.get(el);
    if (cached && cached.odds === odds && el.getAttribute(ATTR) !== null) return;

    el.removeAttribute(FIT_ATTR);
    el.setAttribute(ATTR, "(" + odds + ")");
    fitCache.set(el, { odds });

    const clip = clippingAncestor(el);
    if (!clip) return;
    const available = clip.getBoundingClientRect().width;
    if (!available) return;

    if (el.getBoundingClientRect().width <= available) return;
    el.setAttribute(FIT_ATTR, "1"); // drop the parentheses, shrink slightly
    el.setAttribute(ATTR, odds);

    if (el.getBoundingClientRect().width <= available) return;
    el.setAttribute(FIT_ATTR, "2"); // smallest readable size
  }

  /* ---------------------------------------------------------------- badges */

  function setBadge(el, text, isReel) {
    if (el.getAttribute(ATTR) !== text) el.setAttribute(ATTR, text);
    if (isReel && !el.hasAttribute(REEL_ATTR)) el.setAttribute(REEL_ATTR, "");
  }

  function clearBadge(el) {
    el.removeAttribute(ATTR);
    el.removeAttribute(REEL_ATTR);
    el.removeAttribute(FIT_ATTR);
    fitCache.delete(el);
  }

  function clearAllBadges() {
    document.querySelectorAll("[" + ATTR + "]").forEach(clearBadge);
  }

  // Drop labels from elements that no longer show a percentage (a market that
  // settled, a card that was recycled, etc.).
  function pruneStale() {
    document.querySelectorAll("[" + ATTR + "]").forEach((el) => {
      if (!el.isConnected) return;
      const text = el.textContent.trim();
      if (!text.endsWith("%")) clearBadge(el);
    });
  }

  /* ----------------------------------------------------------- plain text */

  function scanText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const v = node.nodeValue;
        if (!v || v.indexOf("%") === -1) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      const el = node.parentElement;
      if (!el) continue;

      const tag = el.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TITLE") continue;

      // Only label leaf elements, so the appended text always lands directly
      // after the number rather than after a whole row of markup.
      if (el.childElementCount > 0) continue;

      const match = TRAILING_PCT.exec(el.textContent.trim());
      if (!match) continue;

      const odds = toAmericanOdds(parseFloat(match[1]));
      if (odds) applyLabel(el, odds);
      else clearBadge(el);
    }
  }

  /* ---------------------------------------------------------------- reels */

  // A reel column is a clipped box holding a stack of the ten digits; the one
  // currently lined up with the middle of the box is the digit on screen.
  function visibleDigit(column) {
    const stack = column.firstElementChild;
    if (!stack) return null;
    const box = column.getBoundingClientRect();
    if (!box.height) return null;
    const mid = box.top + box.height / 2;
    for (const digit of stack.children) {
      const r = digit.getBoundingClientRect();
      if (mid >= r.top - 0.5 && mid <= r.bottom + 0.5) {
        const t = digit.textContent.trim();
        return /^\d$/.test(t) ? t : null;
      }
    }
    return null; // mid-animation; it will be read on the next tick
  }

  function isReelColumn(el) {
    if (el.childElementCount !== 1) return false;
    const stack = el.firstElementChild;
    if (!stack || stack.childElementCount !== 10) return false;
    return el.textContent.replace(/\s/g, "") === "0123456789";
  }

  // Walk up from the digit row to the element that also contains the "%" sign,
  // so the label is appended after the unit rather than between the two.
  function reelHost(parent) {
    let el = parent;
    for (let i = 0; i < 5 && el && el !== document.body; i++) {
      if (el.textContent.trim().endsWith("%")) return el;
      el = el.parentElement;
    }
    return null;
  }

  function discoverReels() {
    const byParent = new Map();
    const divs = document.body.getElementsByTagName("div");
    for (let i = 0; i < divs.length; i++) {
      const el = divs[i];
      if (!isReelColumn(el)) continue;
      const parent = el.parentElement;
      if (!parent) continue;
      if (!byParent.has(parent)) byParent.set(parent, new Set());
      byParent.get(parent).add(el);
    }

    const groups = [];
    byParent.forEach((columns, parent) => {
      const host = reelHost(parent);
      if (host) groups.push({ parent, columns, host });
    });
    return groups;
  }

  function readReelValue(group) {
    let text = "";
    for (const child of group.parent.children) {
      if (group.columns.has(child)) {
        const digit = visibleDigit(child);
        if (digit === null) return null;
        text += digit;
        continue;
      }
      const t = child.textContent.trim();
      if (t === "." || t === ",") text += ".";
      else if (t === "" || t === "%") continue;
      else return null; // unfamiliar markup — leave this reel alone
    }
    const value = parseFloat(text);
    return isFinite(value) ? value : null;
  }

  function scanReels() {
    if (!reelGroups) return;
    let dropped = false;
    for (const group of reelGroups) {
      if (!group.parent.isConnected || !group.host.isConnected) {
        dropped = true;
        continue;
      }
      const value = readReelValue(group);
      if (value === null) continue;
      const label = labelFor(value);
      if (label) setBadge(group.host, label, true);
      else clearBadge(group.host);
    }
    if (dropped) reelGroups = reelGroups.filter((g) => g.parent.isConnected && g.host.isConnected);
  }

  /* -------------------------------------------------------------- runtime */

  function refresh(rediscoverReels) {
    if (!enabled || !document.body) return;
    pruneStale();
    scanText();
    // Finding reels means walking every div, so throttle it hard — Novig
    // re-renders constantly and the text pass above is the cheap common case.
    const now = Date.now();
    if (reelGroups === null || (rediscoverReels && now - lastDiscovery > RESCAN_MS)) {
      reelGroups = discoverReels();
      lastDiscovery = now;
    }
    scanReels();
  }

  function schedule(rediscoverReels) {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      try {
        refresh(rediscoverReels);
      } catch (e) {
        /* never let a DOM surprise break the page */
      }
    }, DEBOUNCE_MS);
  }

  function start() {
    if (started || !document.body) return;
    started = true;

    refresh(true);

    observer = new MutationObserver(() => schedule(true));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    // Reel digits move by CSS transform, which fires no mutation record.
    ticker = setInterval(() => {
      if (document.hidden || !enabled) return;
      try {
        scanReels();
      } catch (e) {}
    }, TICK_MS);
  }

  function stop() {
    started = false;
    lastDiscovery = 0;
    if (observer) { observer.disconnect(); observer = null; }
    if (ticker) { clearInterval(ticker); ticker = null; }
    reelGroups = null;
    clearAllBadges();
  }

  function apply(next) {
    enabled = next !== false;
    if (enabled) start();
    else stop();
  }

  function boot() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get({ enabled: true }, (result) => {
          apply(!result || result.enabled !== false);
        });
        chrome.storage.onChanged.addListener((changes, area) => {
          if ((area === "sync" || area === "local") && changes.enabled) {
            apply(changes.enabled.newValue !== false);
          }
        });
        return;
      }
    } catch (e) {}
    apply(true); // no extension storage (e.g. dev testing) — just run
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
