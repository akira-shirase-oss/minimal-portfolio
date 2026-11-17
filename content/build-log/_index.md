+++
title = "Build logs"
description = "Every project keeps a public build log — the decisions, the dead ends, and the numbers, written up as they happened. Not a changelog: the whole journey, including the bugs."
template = "build-log.html"

[extra]
# The logs shown here, main project first. Each entry must be a section that
# renders with series.html.
logs = ["colophon/_index.md", "service-monitor/_index.md", "js-runtime/_index.md", "minibtc/_index.md", "durable-runner/_index.md", "payment-sandbox/_index.md", "ai-operations-layer/_index.md", "personal-voice-agent/_index.md", "intent-studio/_index.md", "accounting-reconciliation/_index.md", "native-workspace/_index.md", "backend-platform/_index.md"]
+++

A feature only counts here when its failure behaviour is tested and the
evidence is stored. These logs are where that evidence is written down —
every checkpoint, every load run, every bug that got a catalogue number.
