+++
title = "Build logs"
description = "Every project keeps a public build log — the decisions, the dead ends, and the numbers, written up as they happened. Not a changelog: the whole journey, including the bugs."
template = "build-log.html"

[extra]
# The logs shown here, main project first. Each entry must be a section that
# renders with series.html.
logs = ["colophon/_index.md", "service-monitor/_index.md", "js-runtime/_index.md"]
+++

A feature only counts here when its failure behaviour is tested and the
evidence is stored. These logs are where that evidence is written down —
every checkpoint, every load run, every bug that got a catalogue number.
