// Small touches for the home page and the build log. The pages are complete
// without this file: it only adds motion and live details, and no motion at
// all for readers who ask their system for less.
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. The headline types itself out after `$ whoami`. Every letter is
  //    already in place (just hidden), so nothing on the page moves while it
  //    types, and any markup inside it is kept.
  //    The face in it (.hello-face) is typed like a letter, in its place.
  var heading = document.querySelector(".hero h1");
  if (heading && !reduceMotion) {
    heading.setAttribute("aria-label", heading.textContent.replace(/\s+/g, " ").trim());
    var letters = [];
    var walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (node) {
        if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
        return node.classList.contains("hello-face") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        node.classList.add("ch");
        letters.push(node);
        return;
      }
      var pieces = document.createDocumentFragment();
      Array.from(node.textContent).forEach(function (letter) {
        var span = document.createElement("span");
        span.className = "ch";
        span.textContent = letter;
        pieces.appendChild(span);
        letters.push(span);
      });
      node.replaceWith(pieces);
    });
    heading.classList.add("typing");
    var shown = 0;
    var timer = window.setInterval(function () {
      if (shown > 0) letters[shown - 1].classList.remove("at");
      if (shown >= letters.length) {
        window.clearInterval(timer);
        heading.classList.remove("typing");
        heading.removeAttribute("aria-label");
        return;
      }
      letters[shown].classList.add("on", "at");
      shown += 1;
    }, 60);
  }

  // 2. The clay me in the headline turns toward the pointer: site.js only
  //    says where the pointer is (--turn-x, --turn-y, each -1 to 1), CSS
  //    does the turning. Once per frame at most, transforms only (no
  //    layout). Only with a real mouse, and never with reduced motion.
  var face = document.querySelector(".hello-face");
  var mouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (face && mouse && !reduceMotion) {
    var frame = 0;
    var pointer = null;
    var clamp = function (v) { return Math.max(-1, Math.min(1, v)); };
    var follow = function () {
      frame = 0;
      if (!pointer) {
        face.style.removeProperty("--turn-x");
        face.style.removeProperty("--turn-y");
        return;
      }
      var box = face.getBoundingClientRect();
      // Full turn once the pointer is 40% of the window away from the face.
      var dx = clamp((pointer.x - (box.left + box.width / 2)) / (window.innerWidth * 0.4));
      var dy = clamp((pointer.y - (box.top + box.height / 2)) / (window.innerHeight * 0.4));
      face.style.setProperty("--turn-x", dx.toFixed(3));
      face.style.setProperty("--turn-y", dy.toFixed(3));
    };
    var later = function () { if (!frame) frame = window.requestAnimationFrame(follow); };
    document.addEventListener("pointermove", function (event) {
      pointer = { x: event.clientX, y: event.clientY };
      later();
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", function () {
      pointer = null;
      later();
    });
  }

  // 3. A live UTC clock next to "Status", like a control room's wall clock.
  var clock = document.querySelector("[data-clock]");
  if (clock) {
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var tick = function () {
      var now = new Date();
      clock.textContent =
        pad(now.getUTCHours()) + ":" + pad(now.getUTCMinutes()) + ":" + pad(now.getUTCSeconds()) + " UTC";
    };
    tick();
    clock.hidden = false;
    window.setInterval(tick, 1000);
  }

  // 4. The strip's readout names the entry under the pointer, and goes back
  //    to the latest entry after.
  //    A click on a bar opens its entry (Ctrl/Cmd+click: in a new tab). The
  //    bars are a picture, not links: keyboards and screen readers use the
  //    list of entries below, which links the same pages.
  document.querySelectorAll(".strip-wrap").forEach(function (scope) {
    scope.classList.add("strip-live");
    scope.addEventListener("click", function (event) {
      var bar = event.target.closest("[data-href]");
      if (!bar) return;
      if (event.ctrlKey || event.metaKey) window.open(bar.dataset.href, "_blank", "noopener");
      else window.location.assign(bar.dataset.href);
    });
    var readout = scope.querySelector("[data-readout]");
    if (!readout) return;
    var show = function (event) {
      var item = event.target.closest("[data-label]");
      if (item) readout.textContent = item.dataset.label;
    };
    var reset = function () { readout.textContent = readout.dataset.default; };
    scope.addEventListener("pointerover", show);
    scope.addEventListener("pointerleave", reset);
  });

})();
