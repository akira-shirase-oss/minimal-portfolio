// macOS App interactions for 404human.dev (active only when data-style="macos").
// Zero dependencies, safe DOM builders (no innerHTML), shares Zola #term-data JSON.
(function () {
  var root = document.documentElement;
  var clockEl = document.getElementById("mac-clock");
  var spotBtn = document.getElementById("mac-spotlight-btn");
  var spotWrap = document.getElementById("mac-spotlight");
  var spotInput = document.getElementById("mac-spot-input");
  var spotList = document.getElementById("mac-spot-list");
  var restorePill = document.getElementById("mac-restore-pill");
  var dataEl = document.getElementById("term-data");
  if (!spotWrap || !spotInput || !spotList || !dataEl) return;

  var DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }

  // Build searchable index from Zola build-time data
  var INDEX = [];
  var pageItems = [
    { group: "Pages", title: "Home", sub: "Workspace overview", href: DATA.urls.home },
    { group: "Pages", title: "Projects", sub: DATA.projectsCount + " tracked projects", href: DATA.urls.projects },
    { group: "Pages", title: "Knowledge Hub", sub: DATA.postsCount + " articles", href: DATA.urls.posts },
    { group: "Pages", title: "Build logs", sub: DATA.logsCount + " project logs", href: DATA.urls.logs },
    { group: "Pages", title: "Learning", sub: "Hands-on study notes", href: DATA.urls.learn },
    { group: "Pages", title: "Progress", sub: "Full project ledger", href: DATA.urls.progress }
  ];
  for (var p = 0; p < pageItems.length; p++) INDEX.push(pageItems[p]);
  var CORE = ["Colophon CMS", "Durable Runner", "Service Monitor", "jsrt", "MiniBTC"];
  var sortedProjects = DATA.projects.slice().sort(function (a, b) {
    var ai = CORE.indexOf(a.name);
    var bi = CORE.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });
  for (var i = 0; i < sortedProjects.length; i++) {
    var pr = sortedProjects[i];
    INDEX.push({
      group: "Projects",
      title: pr.name,
      sub: (pr.status ? "[" + pr.status + "] " : "") + (pr.about || ""),
      href: pr.href || pr.site || DATA.urls.projects
    });
  }
  for (var j = 0; j < DATA.posts.length; j++) {
    var po = DATA.posts[j];
    INDEX.push({
      group: "Articles",
      title: po.title,
      sub: po.date + " · " + po.time + " min read",
      href: po.href
    });
  }
  var styleActions = [
    { group: "Appearance", title: "Switch to Notion", sub: "Default editorial workspace", style: "notion" },
    { group: "Appearance", title: "Switch to Windows 7", sub: "Aero Glass Explorer + Taskbar", style: "win7" },
    { group: "Appearance", title: "Switch to Windows 97", sub: "Classic 3D bevels + Start Taskbar", style: "win97" },
    { group: "Appearance", title: "Switch to Terminal", sub: "Interactive tmux CLI shell", style: "terminal" },
    { group: "Appearance", title: "Switch to Swiss", sub: "International Typographic broadsheet", style: "swiss" },
    { group: "Appearance", title: "Toggle Light / Dark", sub: "Switch macOS appearance", toggleTheme: true }
  ];
  for (var s = 0; s < styleActions.length; s++) INDEX.push(styleActions[s]);

  var results = [];
  var activeIdx = 0;

  function isMac() {
    return root.dataset.style === "macos";
  }

  function syncSettingsUI() {
    var panel = document.getElementById("settings-panel");
    if (!panel) return;
    var curStyle = root.dataset.style || "notion";
    var curTheme = root.dataset.theme || "light";
    panel.querySelectorAll("[data-set-style]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-set-style") === curStyle ? "true" : "false");
    });
    panel.querySelectorAll("[data-set-theme]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-set-theme") === curTheme ? "true" : "false");
    });
  }

  // ---- Menu Bar Clock ----
  function updateClock() {
    if (!clockEl) return;
    var now = new Date();
    try {
      clockEl.textContent = now.toLocaleTimeString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
    } catch (e) {
      clockEl.textContent = now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
    }
  }
  updateClock();
  setInterval(updateClock, 30000);

  // ---- Interactive Traffic-Light Window States ----
  function setWinState(state) {
    if (!state || root.dataset.macState === state) {
      delete root.dataset.macState;
      if (restorePill) restorePill.hidden = true;
    } else {
      root.dataset.macState = state;
      if (restorePill) restorePill.hidden = state !== "minimized";
    }
  }

  document.addEventListener("click", function (e) {
    if (!isMac()) return;
    var winBtn = e.target.closest("[data-mac-win]");
    if (winBtn) {
      var action = winBtn.getAttribute("data-mac-win");
      if (action === "min") setWinState("minimized");
      else if (action === "compact") setWinState("compact");
      else if (action === "full") setWinState("full");
      return;
    }
    // Clicking Dock Home icon while minimized restores the window cleanly
    var dockItem = e.target.closest(".os-dock-item");
    if (dockItem && root.dataset.macState === "minimized") {
      setWinState("");
    }
  });

  if (restorePill) {
    restorePill.addEventListener("click", function () {
      setWinState("");
    });
  }

  // Clear macOS window state if user switches away from macOS
  new MutationObserver(function () {
    if (!isMac()) {
      setWinState("");
      closeSpotlight();
    }
  }).observe(root, { attributes: true, attributeFilter: ["data-style"] });

  // ---- Spotlight Search ----
  function renderSpotlight(query) {
    var q = (query || "").toLowerCase().trim();
    results = [];
    for (var k = 0; k < INDEX.length; k++) {
      var item = INDEX[k];
      if (!q || item.title.toLowerCase().indexOf(q) !== -1 || item.sub.toLowerCase().indexOf(q) !== -1 || item.group.toLowerCase().indexOf(q) !== -1) {
        results.push(item);
        if (results.length >= 8) break;
      }
    }
    activeIdx = 0;
    spotList.textContent = "";

    if (!results.length) {
      var empty = document.createElement("li");
      empty.className = "mac-spot-empty";
      empty.textContent = 'No results for "' + query + '"';
      spotList.appendChild(empty);
      return;
    }

    for (var r = 0; r < results.length; r++) {
      var it = results[r];
      var li = document.createElement("li");
      li.className = "mac-spot-item" + (r === 0 ? " is-active" : "");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", r === 0 ? "true" : "false");
      li.dataset.idx = String(r);

      var left = document.createElement("div");
      left.className = "mac-spot-main";
      var t = document.createElement("span");
      t.className = "mac-spot-title";
      t.textContent = it.title;
      var sub = document.createElement("span");
      sub.className = "mac-spot-sub";
      sub.textContent = it.sub;
      left.appendChild(t);
      left.appendChild(sub);

      var badge = document.createElement("span");
      badge.className = "mac-spot-group";
      badge.textContent = it.group;

      li.appendChild(left);
      li.appendChild(badge);
      spotList.appendChild(li);
    }
  }

  function highlight(idx) {
    var items = spotList.querySelectorAll(".mac-spot-item");
    if (!items.length) return;
    activeIdx = (idx + items.length) % items.length;
    for (var i = 0; i < items.length; i++) {
      var on = i === activeIdx;
      items[i].classList.toggle("is-active", on);
      items[i].setAttribute("aria-selected", on ? "true" : "false");
    }
  }

  function activate(idx) {
    var item = results[idx];
    if (!item) return;
    closeSpotlight();
    if (item.style) {
      root.dataset.style = item.style;
      try { localStorage.setItem("style", item.style); } catch (e) {}
      syncSettingsUI();
    } else if (item.toggleTheme) {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncSettingsUI();
    } else if (item.href) {
      window.location.href = item.href;
    }
  }

  function openSpotlight() {
    if (!isMac()) return;
    spotWrap.hidden = false;
    spotInput.value = "";
    renderSpotlight("");
    spotInput.focus();
  }

  function closeSpotlight() {
    spotWrap.hidden = true;
  }

  if (spotBtn) {
    spotBtn.addEventListener("click", function () {
      if (spotWrap.hidden) openSpotlight();
      else closeSpotlight();
    });
  }

  spotWrap.addEventListener("click", function (e) {
    if (e.target === spotWrap) {
      closeSpotlight();
      return;
    }
    var li = e.target.closest(".mac-spot-item");
    if (li) activate(Number(li.dataset.idx));
  });

  spotInput.addEventListener("input", function () {
    renderSpotlight(spotInput.value);
  });

  spotInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(activeIdx + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(activeIdx - 1); }
    else if (e.key === "Enter") { e.preventDefault(); activate(activeIdx); }
    else if (e.key === "Escape") { e.preventDefault(); closeSpotlight(); }
  });

  document.addEventListener("keydown", function (e) {
    if (!isMac()) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (spotWrap.hidden) openSpotlight();
      else closeSpotlight();
    } else if (e.key === "Escape" && !spotWrap.hidden) {
      closeSpotlight();
    }
  });
})();
