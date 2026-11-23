+++
title = "Securing MCP servers for AI agents: draft-only permissions and budgets"
description = "Security boundaries for production MCP servers: read-only defaults, draft-only writes, explicit approval gates, scoped tokens, and audit trails."
date = 2026-11-23T11:30:00-05:00

[taxonomies]
tags = ["ai", "security", "rust", "architecture"]

[extra]
kind = "guide"
+++

Connecting an AI agent to a production database or CMS through a **Model Context Protocol (MCP)** server turns prompt injection into an authorization problem. If your MCP server exposes `delete_record` or `publish_to_production` with an admin token, one malicious sentence inside a customer email, web page, or support ticket can trick the model into executing it.

Across our MCP implementations in [Colophon CMS](@/colophon/_index.md) (`colophon-mcp`), [MiniBTC](@/minibtc/_index.md), and [Personal Voice Agent](@/personal-voice-agent/_index.md), we treat the model as an **untrusted caller** operating inside hard, Rust-enforced walls.

## The five security boundaries every production MCP server needs

### 1. Read-only by default, draft-only for writes
Never give an AI agent direct publish, delete, or money-moving tools. In Colophon's MCP server, an agent can read content and propose a **draft changeset**, never publish it live. A human (or a separate deterministic policy gate) reviews and approves the exact candidate hash.

### 2. Never let the agent self-approve
Approval must bind to the exact artifact or payload the human saw—and the agent's credential must not have permission to call the approval endpoint. In [Intent Studio](@/intent-studio/_index.md), approval binds cryptographically to a candidate snapshot; in [Personal Voice Agent](@/personal-voice-agent/_index.md), what was *heard*, what was *inferred*, and what was *executed* live in separate ledger states.

### 3. Strict schema validation (avoid silent enum traps)
In our own local Qwen tool-use tests ([the assistant failed before the model](@/posts/the-assistant-failed-before-the-model.md)), a tight `enum` in a tool schema forced the model to pick the wrong project when the real one wasn't listed—producing a confident, wrong answer. Return explicit, structured `not_found` and `permission_denied` errors instead of coercing inputs into valid defaults.

### 4. Scoped tokens, budgets, and bounded outputs
- **Least-privilege tokens:** An MCP token should be scoped to one workspace/tenant and one capability set (e.g., `content:read`, `draft:write`), never a superuser API key.
- **Per-session budgets:** Cap tool calls per minute, bytes returned per call (so a single `SELECT` cannot dump a whole table into the prompt context), and outbound network destinations (SSRF blocklists on every URL parameter).
- **Zero secrets in tool responses or logs:** Redact tokens, connection strings, and headers *before* returning tool output to the model—anything returned to the LLM context can be exfiltrated in the next tool call.

### 5. Immutable audit trail of every tool call
Log every MCP invocation with:
- caller token ID and tenant ID,
- exact tool name and canonicalized arguments (with secrets stripped),
- decision (`allowed`, `denied`, `rate_limited`), and
- resulting draft/resource ID.

## A quick MCP threat checklist before shipping

| Attack vector | Defense on the MCP server |
|---|---|
| Prompt injection asks agent to delete/publish | No destructive or publish tools exposed; draft-only writes |
| Prompt injection asks agent to read another tenant | Token scoped to one tenant + [PostgreSQL RLS](@/posts/postgresql-row-level-security-multi-tenant-saas.md) |
| Agent tries to fetch `http://169.254.169.254` | Strict SSRF gate after DNS resolution, re-checked on redirects |
| Agent loops 10,000 tool calls | Per-token rate limit + hard per-session call budget |
| Tool returns a secret into context | Server-side redaction + never expose raw credentials to tools |

## Frequently asked questions

**Can we rely on system prompts ("never delete anything") instead of server-side restrictions?**
No. System prompts are guidance, not access control. Any security boundary that matters must be enforced in the MCP server and database layer, assuming the model can be completely steered by untrusted input.
