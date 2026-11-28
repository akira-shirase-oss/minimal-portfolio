// Interactive terminal shell for 404human.dev (active only in Terminal design system).
// Zero dependencies, safe DOM builders (no innerHTML), backed by Zola build-time JSON.
(function () {
  var root = document.documentElement;
  var shell = document.getElementById("term-shell");
  var out = document.getElementById("term-out");
  var form = document.getElementById("term-form");
  var input = document.getElementById("term-input");
  var chips = document.getElementById("term-chips");
  var dataEl = document.getElementById("term-data");
  if (!shell || !out || !form || !input || !dataEl) return;

  var DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }

  var STYLES = ["notion", "linear", "vscode", "figma", "obsidian", "arc", "notes", "docs", "macos", "win7", "win97", "terminal", "swiss"];
  var CORE = ["Colophon CMS", "Durable Runner", "Service Monitor", "jsrt", "MiniBTC"];
  var COMMANDS = [
    "help", "whoami", "neofetch", "ls", "projects", "cat",
    "writing", "now", "cd", "open", "theme", "style",
    "history", "uname", "ping", "clear"
  ];
  var history = [];
  var histIdx = -1;
  var booted = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function linkEl(href, text, external) {
    var a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    if (external) a.rel = "noopener";
    return a;
  }

  function line(parts, cls) {
    var div = el("div", "term-line" + (cls ? " " + cls : ""));
    if (typeof parts === "string") {
      div.textContent = parts;
    } else if (Array.isArray(parts)) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (typeof p === "string") div.appendChild(document.createTextNode(p));
        else if (p) div.appendChild(p);
      }
    }
    out.appendChild(div);
    return div;
  }

  function echoCmd(cmd) {
    line([
      el("span", "term-accent", "404human@dev:~$ "),
      el("span", "term-cmd", cmd)
    ], "term-echo");
  }

  function syncSettingsUI() {
    var panel = document.getElementById("settings-panel");
    if (!panel) return;
    var curStyle = root.dataset.style || "notion";
    var curTheme = root.dataset.theme || "dark";
    panel.querySelectorAll("[data-set-style]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-set-style") === curStyle ? "true" : "false");
    });
    panel.querySelectorAll("[data-set-theme]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-set-theme") === curTheme ? "true" : "false");
    });
  }

  function findProject(query) {
    var q = (query || "").toLowerCase().trim();
    if (!q) return null;
    for (var i = 0; i < DATA.projects.length; i++) {
      if (DATA.projects[i].name.toLowerCase() === q) return DATA.projects[i];
    }
    for (var j = 0; j < DATA.projects.length; j++) {
      var cp = DATA.projects[j];
      if (CORE.indexOf(cp.name) !== -1 && cp.name.toLowerCase().indexOf(q) !== -1) return cp;
    }
    for (var k = 0; k < DATA.projects.length; k++) {
      if (DATA.projects[k].name.toLowerCase().indexOf(q) !== -1) return DATA.projects[k];
    }
    return null;
  }

  function printNeofetch() {
    var ascii = [
      " _  _    ___  _  _   ",
      "| || |  / _ \\| || |  ",
      "| || |_| | | | || |_ ",
      "|__   _| |_| |__   _|",
      "   |_|  \\___/   |_|  "
    ];
    var info = [
      ["host", "404human.dev"],
      ["engine", "Zola (Rust static)"],
      ["articles", DATA.postsCount + " published"],
      ["projects", DATA.projectsCount + " tracked (" + DATA.logsCount + " build logs)"],
      ["focus", "rust · postgres · ai · reliability"],
      ["now", "Colophon CMS (live alpha)"],
      ["style", (root.dataset.style || "terminal") + " (" + (root.dataset.theme || "dark") + ")"],
      ["tracking", "0 bytes · zero cookies"]
    ];
    var wrap = el("div", "term-neofetch");
    var pre = el("pre", "term-ascii", ascii.join("\n"));
    var meta = el("div", "term-nf-meta");
    for (var i = 0; i < info.length; i++) {
      var row = el("div", "term-nf-row");
      row.appendChild(el("span", "term-accent", info[i][0] + ": "));
      row.appendChild(document.createTextNode(info[i][1]));
      meta.appendChild(row);
    }
    wrap.appendChild(pre);
    wrap.appendChild(meta);
    out.appendChild(wrap);
  }

  function printHelp() {
    var rows = [
      ["whoami", "profile, status, and current focus"],
      ["neofetch", "ASCII banner + live site stats"],
      ["ls", "list workspace directories and files"],
      ["projects", "show the 5 core projects (or 'projects all')"],
      ["cat <name>", "inspect a project (e.g. cat colophon, cat jsrt)"],
      ["writing", "latest published articles"],
      ["now", "what is actively shipping right now"],
      ["cd <dir>", "jump to home, projects, posts, logs, learn, progress"],
      ["theme <mode>", "switch light | dark"],
      ["style <name>", "switch notion | win7 | win97 | macos | swiss"],
      ["clear", "clear terminal buffer"]
    ];
    for (var i = 0; i < rows.length; i++) {
      line([
        el("span", "term-key", rows[i][0]),
        el("span", "term-dim", rows[i][1])
      ]);
    }
  }

  function printProjects(showAll) {
    var list = showAll ? DATA.projects : DATA.projects.filter(function (p) {
      return CORE.indexOf(p.name) !== -1;
    });
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var parts = [
        el("span", "term-tag", "[" + (p.status || "wip") + "] "),
        p.href ? linkEl(p.href, p.name, p.href.indexOf("http") === 0) : el("span", "term-cmd", p.name)
      ];
      if (p.site) {
        parts.push("  ");
        parts.push(linkEl(p.site, p.site.replace(/^https?:\/\//, "") + " ↗", true));
      }
      line(parts);
      if (!showAll && p.about) {
        line("  " + p.about, "term-dim");
      }
    }
    if (!showAll) {
      line([
        el("span", "term-dim", "Tip: run "),
        el("span", "term-accent", "cat colophon"),
        el("span", "term-dim", " for details or "),
        el("span", "term-accent", "projects all"),
        el("span", "term-dim", " for all " + DATA.projectsCount + ".")
      ]);
    }
  }

  function navigateTo(target) {
    var t = (target || "").toLowerCase().replace(/^(\.\/|\/|~\/)/, "").replace(/\/$/, "");
    var map = {
      "": DATA.urls.home,
      "~": DATA.urls.home,
      "home": DATA.urls.home,
      "projects": DATA.urls.projects,
      "posts": DATA.urls.posts,
      "writing": DATA.urls.posts,
      "hub": DATA.urls.posts,
      "knowledge": DATA.urls.posts,
      "logs": DATA.urls.logs,
      "build-log": DATA.urls.logs,
      "learn": DATA.urls.learn,
      "learning": DATA.urls.learn,
      "progress": DATA.urls.progress,
      "rss": DATA.urls.rss,
      "llms": DATA.urls.llms,
      "llms.txt": DATA.urls.llms,
      "github": DATA.urls.github,
      "x": DATA.urls.x
    };
    if (map[t]) {
      line("opening " + map[t] + " ...", "term-dim");
      window.location.href = map[t];
      return true;
    }
    var pr = findProject(t);
    if (pr && (pr.site || pr.href)) {
      var dest = pr.site || pr.href;
      line("opening " + dest + " ...", "term-dim");
      window.location.href = dest;
      return true;
    }
    return false;
  }

  function runCommand(raw) {
    var cmd = (raw || "").trim();
    if (!cmd) return;
    history.push(cmd);
    histIdx = history.length;
    echoCmd(cmd);

    var parts = cmd.split(/\s+/);
    var head = parts[0].toLowerCase();
    var arg = parts.slice(1).join(" ").trim();
    var argLower = arg.toLowerCase();

    if (head === "clear" || head === "cls") {
      out.textContent = "";
      return;
    }
    if (head === "help" || head === "?") {
      printHelp();
    } else if (head === "neofetch") {
      printNeofetch();
    } else if (head === "whoami") {
      line([el("span", "term-accent", "404human"), " — open-source systems engineer"]);
      line("hey, I break things. Then I fix them, and write down what I learned.", "term-dim");
      line("Mostly Rust: runtimes, background jobs, AI tools. All in public, mistakes included.", "term-dim");
      line([
        el("span", "term-dim", "Status: "), el("span", "term-accent", "building in public"),
        el("span", "term-dim", "  ·  Focus: "), "#rust #postgres #ai #reliability"
      ]);
    } else if (head === "now") {
      line([
        el("span", "term-accent", "Now: "),
        "Colophon CMS — open-source Rust + Svelte CMS that proves what it published. Live alpha: ",
        linkEl("https://colophon.404human.dev", "colophon.404human.dev ↗", true)
      ]);
    } else if (head === "ls" || head === "ll") {
      if (argLower === "projects" || argLower === "projects/") {
        printProjects(false);
      } else if (argLower === "posts" || argLower === "writing") {
        runWriting();
      } else {
        line([
          linkEl(DATA.urls.projects, "projects/"), "   ",
          linkEl(DATA.urls.posts, "posts/(" + DATA.postsCount + ")"), "   ",
          linkEl(DATA.urls.logs, "build-log/(" + DATA.logsCount + ")"), "   ",
          linkEl(DATA.urls.learn, "learn/"), "   ",
          linkEl(DATA.urls.progress, "progress/"), "   ",
          linkEl(DATA.urls.llms, "llms.txt"), "   ",
          linkEl(DATA.urls.rss, "rss.xml")
        ]);
      }
    } else if (head === "projects") {
      printProjects(argLower === "all" || argLower === "-a" || argLower === "--all");
    } else if (head === "writing" || head === "posts" || head === "articles") {
      runWriting();
    } else if (head === "cat") {
      if (!arg) {
        line("usage: cat <project>  (try: cat colophon, cat runner, cat monitor, cat jsrt, cat minibtc)", "term-dim");
      } else if (argLower === "readme" || argLower === "readme.md") {
        runCommand("whoami");
        return;
      } else {
        var pr = findProject(arg);
        if (!pr) {
          line("cat: " + arg + ": No such project. Try 'projects' to list them.", "term-err");
        } else {
          line([el("span", "term-accent", pr.name), "  ", el("span", "term-tag", "[" + (pr.status || "wip") + "]")]);
          line(pr.about, "term-dim");
          var links = [];
          if (pr.site) links.push(linkEl(pr.site, pr.site.replace(/^https?:\/\//, "") + " ↗", true));
          if (pr.href) {
            if (links.length) links.push("  ·  ");
            links.push(linkEl(pr.href, "build log →", pr.href.indexOf("http") === 0));
          }
          if (links.length) line(links);
        }
      }
    } else if (head === "cd" || head === "open") {
      if (!arg) {
        line("usage: cd <home|projects|posts|logs|learn|progress|colophon|github>", "term-dim");
      } else if (!navigateTo(arg)) {
        line(head + ": " + arg + ": No such directory or target", "term-err");
      }
    } else if (head === "theme") {
      if (argLower === "light" || argLower === "dark") {
        root.dataset.theme = argLower;
        try { localStorage.setItem("theme", argLower); } catch (e) {}
        syncSettingsUI();
        line("theme set to " + argLower + ".", "term-accent");
      } else {
        line("usage: theme <light|dark>  (current: " + (root.dataset.theme || "dark") + ")", "term-dim");
      }
    } else if (head === "style" || head === "design") {
      if (STYLES.indexOf(argLower) !== -1) {
        root.dataset.style = argLower;
        try { localStorage.setItem("style", argLower); } catch (e) {}
        syncSettingsUI();
        line("switched design system -> " + argLower, "term-accent");
      } else {
        line("available styles: " + STYLES.join(", "), "term-dim");
      }
    } else if (head === "history") {
      for (var h = 0; h < history.length; h++) {
        line("  " + (h + 1) + "  " + history[h], "term-dim");
      }
    } else if (head === "uname") {
      line("Zola 0.23.6 404human-rust-static x86_64/arm64 zero-tracking");
    } else if (head === "ping") {
      line("PING " + (arg || "404human.dev") + ": 64 bytes icmp_seq=0 ttl=64 time=0.42 ms (0 trackers)");
    } else if (head === "sudo") {
      line("404human is not in the sudoers file. This incident will be logged in /build-log/.", "term-err");
    } else if (head === "rm" && arg.indexOf("-rf") !== -1) {
      line("nice try. Colophon keeps an append-only hash chain anyway.", "term-err");
    } else {
      line("zsh: command not found: " + head + "  (type 'help' for available commands)", "term-err");
    }

    out.scrollTop = out.scrollHeight;
  }

  function runWriting() {
    for (var i = 0; i < DATA.posts.length; i++) {
      var p = DATA.posts[i];
      line([
        el("span", "term-dim", p.date + "  "),
        linkEl(p.href, p.title),
        el("span", "term-dim", " (" + p.time + "m)")
      ]);
    }
    line([
      el("span", "term-dim", "Browse all " + DATA.postsCount + " articles -> "),
      linkEl(DATA.urls.posts, "/posts/")
    ]);
  }

  function boot() {
    if (booted) return;
    booted = true;
    line([
      el("span", "term-accent", "404human.dev"),
      el("span", "term-dim", " · Zola static shell · " + DATA.postsCount + " articles · " + DATA.projectsCount + " projects · zero tracking")
    ]);
    line([
      el("span", "term-dim", "Type "),
      el("span", "term-accent", "help"),
      el("span", "term-dim", " or click a command below. Try "),
      el("span", "term-accent", "neofetch"),
      el("span", "term-dim", ", "),
      el("span", "term-accent", "cat colophon"),
      el("span", "term-dim", ", or "),
      el("span", "term-accent", "style macos"),
      el("span", "term-dim", ".")
    ]);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var val = input.value;
    input.value = "";
    runCommand(val);
  });

  if (chips) {
    chips.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cmd]");
      if (!btn) return;
      runCommand(btn.getAttribute("data-cmd"));
      input.focus();
    });
  }

  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp") {
      if (!history.length) return;
      e.preventDefault();
      histIdx = Math.max(0, histIdx - 1);
      input.value = history[histIdx] || "";
    } else if (e.key === "ArrowDown") {
      if (!history.length) return;
      e.preventDefault();
      histIdx = Math.min(history.length, histIdx + 1);
      input.value = history[histIdx] || "";
    } else if (e.key === "Tab") {
      e.preventDefault();
      var val = input.value;
      var parts = val.split(/\s+/);
      if (parts.length <= 1) {
        var q = parts[0].toLowerCase();
        var match = COMMANDS.find(function (c) { return c.indexOf(q) === 0; });
        if (match) input.value = match + (match === "cat" || match === "cd" || match === "style" || match === "theme" ? " " : "");
      } else if (parts[0].toLowerCase() === "style") {
        var sq = parts[1].toLowerCase();
        var sm = STYLES.find(function (s) { return s.indexOf(sq) === 0; });
        if (sm) input.value = "style " + sm;
      } else if (parts[0].toLowerCase() === "theme") {
        var tq = parts[1].toLowerCase();
        var tm = ["light", "dark"].find(function (t) { return t.indexOf(tq) === 0; });
        if (tm) input.value = "theme " + tm;
      } else if (parts[0].toLowerCase() === "cat") {
        var pq = parts.slice(1).join(" ").toLowerCase();
        var pm = DATA.projects.find(function (p) { return p.name.toLowerCase().indexOf(pq) === 0; });
        if (pm) input.value = "cat " + pm.name.toLowerCase().split(" ")[0];
      }
    }
  });

  shell.addEventListener("click", function (e) {
    if (e.target.closest("a, button, input")) return;
    if (window.getSelection && window.getSelection().toString()) return;
    input.focus();
  });

  // Boot lazily only when Terminal design system is active
  function checkBoot() {
    if (root.dataset.style === "terminal") boot();
  }
  checkBoot();
  new MutationObserver(checkBoot).observe(root, { attributes: true, attributeFilter: ["data-style"] });
})();
