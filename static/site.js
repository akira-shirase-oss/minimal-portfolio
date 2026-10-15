// Small touches for the home page and the build log. The pages are complete
// without this file: it only adds motion and live details, and it adds no
// motion at all for readers who ask their system for less.
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. The name types itself out after `$ whoami`. Every letter is already in
  //    place (just hidden), so nothing on the page moves while it types, and
  //    the coloured italic word keeps its markup.
  var heading = document.querySelector(".hero h1");
  if (heading && !reduceMotion) {
    heading.setAttribute("aria-label", heading.textContent);
    var letters = [];
    var walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function (node) {
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

  // 2. A live UTC clock next to "Status", like a control room's wall clock.
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

  // 3. Readouts: the build-log strip and the orbit name the entry under the
  //    pointer or the keyboard focus, and go back to their default after.
  document.querySelectorAll(".strip-wrap, .orbit").forEach(function (scope) {
    var readout = scope.querySelector("[data-readout]");
    if (!readout) return;
    var show = function (event) {
      var item = event.target.closest("[data-label]");
      if (item) readout.textContent = item.dataset.label;
    };
    var reset = function () { readout.textContent = readout.dataset.default; };
    scope.addEventListener("pointerover", show);
    scope.addEventListener("focusin", show);
    scope.addEventListener("pointerleave", reset);
    scope.addEventListener("focusout", reset);
  });

  // 4. Sections below the first screen slide in as they arrive. Anything
  //    already on screen is left alone, so nothing visible ever blinks.
  if (!reduceMotion && "IntersectionObserver" in window) {
    var sections = document.querySelectorAll(".home > h2, .procs, .home > .panel, .cards, .home > .log");
    var observer = new IntersectionObserver(function (seen) {
      seen.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top > window.innerHeight) {
        section.classList.add("will-reveal");
        observer.observe(section);
      }
    });
  }
})();
