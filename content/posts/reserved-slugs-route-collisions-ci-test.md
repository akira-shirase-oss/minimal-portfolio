+++
title = "Why naming a collection /media broke our app"
description = "Hand-maintained reserved-slug lists always rot when new routes ship. Fix route collisions permanently with a CI test that reads your frontend route tree."
date = 2026-11-27T12:10:00-05:00

[taxonomies]
tags = ["architecture", "reliability", "rust"]

[extra]
kind = "failure"
+++

Every SaaS app eventually lets users name something that ends up in a URL: a username (`/@handle`), a workspace (`/acme`), or a CMS collection (`/posts`).

Everything works cleanly until someone creates a collection named `media`, `tasks`, `audience`, or `import`. The database accepts the row, returns `201 Created`, and shows it in the sidebar. Then the user clicks it—and lands on the app's own built-in Media Library page instead of their collection.

We hit this exact bug while dogfooding [Colophon CMS](@/colophon/_index.md). A collection named `media` could be created through the API and could **never be opened** in the Studio, because SvelteKit's static `/projects/[project]/media` route shadows the dynamic `/projects/[project]/[collection]` route.

## Why hand-typed `RESERVED_SLUGS` arrays always rot

The standard first fix is a hardcoded list in the backend validator:

```rust
const RESERVED_SLUGS: &[&str] = &["media", "settings", "tasks", "api"];
```

That fixes today's bug and silently guarantees next month's bug.

Three weeks later, someone adds a new SvelteKit page at `src/routes/projects/[project]/import/+page.svelte` or `.../audience/+page.svelte`. The frontend compiles, the backend compiles, every unit test passes—and the backend has no idea `import` and `audience` are now shadowed routes.

Two different places (your frontend router and your backend validator) are trying to stay in sync by memory alone. Memory always loses.

## The fix: make CI read the real route tree

Instead of trusting humans to remember to update a constant, turn the frontend directory tree into the source of truth in a test.

In Colophon's Studio (SvelteKit), every sibling route next to `[collection]` is literally a folder under `apps/studio/src/routes/projects/[project]/`:

```text
apps/studio/src/routes/projects/[project]/
├── [collection]/     <- user-created collection slugs land here
├── audience/         <- static route: must be reserved!
├── import/           <- static route: must be reserved!
├── media/            <- static route: must be reserved!
├── releases/         <- static route: must be reserved!
├── settings/         <- static route: must be reserved!
└── tasks/            <- static route: must be reserved!
```

Our CI test walks that exact directory, collects every static folder name (ignoring dynamic `[param]` folders and route groups like `(auth)`), and asserts that **every single one is rejected by the backend's slug validator**:

```rust
#[test]
fn every_studio_sibling_route_is_reserved() {
    let routes_dir = Path::new("../../apps/studio/src/routes/projects/[project]");
    for entry in std::fs::read_dir(routes_dir).expect("read studio routes") {
        let entry = entry.unwrap();
        if !entry.file_type().unwrap().is_dir() {
            continue;
        }
        let name = entry.file_name().into_string().unwrap();
        // Skip dynamic params like `[collection]` and SvelteKit `(groups)`.
        if name.starts_with('[') || name.starts_with('(') {
            continue;
        }
        assert!(
            validate_collection_slug(&name).is_err(),
            "Studio route `/{name}` is not in RESERVED_COLLECTION_SLUGS"
        );
    }
}
```

Now, the moment anyone adds a new Studio page at `.../analytics/+page.svelte` and forgets to reserve `analytics` in Rust, CI fails immediately with the exact missing slug name.

## Even better: prefix user slugs if you haven't shipped yet

If you're designing a greenfield URL structure today, the cleanest way to eliminate route collisions forever is to **never share a namespace** between app routes and user slugs:

- App routes: `/settings`, `/media`, `/import`
- User resources: `/c/media` (collections), `/u/admin` (users), or `/w/billing` (workspaces)

When you *do* want clean top-level slugs (for aesthetics, ergonomics, or an existing API contract), keeping a backend reserved list paired with a route-scanning CI test gives you the clean URLs without silent regressions.

## One more edge case: case-insensitivity and normalization

Make sure your reserved-slug check runs on the **normalized** slug (lowercase, trimmed), and enforce the same check at the domain/API boundary—not just in a frontend form. In our dogfooding pass, the API and MCP tools could create collections without ever touching the Studio UI, which is how a reserved name slipped in until we enforced it on the server.

For more on turning security and routing assumptions into tests that actually fail when broken, see [How we proved our security attack tests actually fail](@/posts/proving-security-attack-tests-fail-with-mutation-harness.md) and our full [dogfooding teardown](@/posts/running-our-cms-website-on-itself-through-mcp.md).

## Frequently asked questions

**What if my frontend is in a separate repository from my backend?**
Export the static route list as a tiny JSON manifest during the frontend build (or keep a shared contract file in CI) and run the same assertion against that manifest. The principle is identical: derive reserved names from the router, never from human memory.

**Should reserved slugs return `400 Bad Request` or `422 Unprocessable Entity`?**
Return `422 Unprocessable Entity` (or `400` if your API uses it for validation) with a clear error message naming why the slug isn't allowed—never `409 Conflict`, which misleads users into thinking another hidden resource already took that name.
