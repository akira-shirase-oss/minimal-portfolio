import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openStore } from "../store.mjs";
import { createApp } from "../app.mjs";
import { createDashboardServices } from "../dashboard.mjs";
import { modelConfig } from "../model.mjs";

function setup(t, fetchImpl) {
  const root = mkdtempSync(join(tmpdir(), "qwen-dashboard-"));
  const runDirectory = join(root, "runs"), manifestPath = join(root, "manifest.json");
  mkdirSync(runDirectory); const store = openStore();
  t.after(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
  return { root, store, runDirectory, manifestPath,
    ...createDashboardServices({ store, runDirectory, manifestPath, fetchImpl }) };
}
test("dashboard reads saved runs, preserves failed status, and refuses file traversal", async t => {
  const fixture = setup(t, async () => { throw new Error("offline"); });
  const record = { request_id: "saved-run", question: "Synthetic failure", status: "runtime_error", tool_calls: 0 };
  writeFileSync(join(fixture.runDirectory, "saved-run.json"), JSON.stringify(record));
  writeFileSync(join(fixture.runDirectory, "broken.json"), "{");
  writeFileSync(join(fixture.root, "private.json"), '{"private":true}');
  const data = await fixture.dashboard();
  assert.equal(data.activity.total, 2); assert.equal(data.activity.unreadable, 1);
  assert.equal(data.activity.runs[0].status, "runtime_error");
  assert.equal(data.activity.runs[0].wall_seconds, null);
  assert.deepEqual(fixture.runDetails("saved-run"), record);
  assert.equal(fixture.runDetails("../private"), null);
  assert.equal(data.model.ready, false); assert.equal(data.model.files_ready, false);
});
test("health and pinned download identity are separate checks, with honest offline results", async t => {
  let online = true;
  const fixture = setup(t, async url => { assert.equal(url, "http://127.0.0.1:8080/health"); if (!online) throw new Error("offline"); return Response.json({ status: "ok" }); });
  const manifest = { repository: modelConfig.repository, revision: modelConfig.revision,
    packages: { "mlx-lm": "0.32.2" }, files: { "model.safetensors": { bytes: 123 } } };
  writeFileSync(fixture.manifestPath, JSON.stringify(manifest));
  let data = await fixture.dashboard(); assert.equal(data.model.ready, true); assert.equal(data.model.file_bytes, 123);
  assert.match(data.model.identity_scope, /does not attest/);
  online = false; data = await fixture.dashboard();
  assert.equal(data.model.ready, false); assert.equal(data.model.files_ready, true); assert.equal(data.model.error, "offline");
  online = true; writeFileSync(fixture.manifestPath, JSON.stringify({ ...manifest, revision: "wrong" }));
  assert.equal((await fixture.dashboard()).model.ready, false);
});
test("task browsing searches literal titles and paginates without changing the model tool cap", t => {
  const { store } = setup(t, async () => Response.json({ status: "ok" }));
  for (let i = 1; i <= 25; i++) store.create(`Task ${i}`, `request-${i}`);
  store.create("100% literal", "literal");
  const first = store.browse("TASK"), next = store.browse("task", 1);
  assert.equal(first.total, 25); assert.equal(first.todos.length, 20); assert.equal(first.has_more, true);
  assert.equal(next.todos.length, 5); assert.equal(next.has_more, false);
  assert.equal(new Set([...first.todos, ...next.todos].map(row => row.id)).size, 25);
  assert.equal(store.browse("%").total, 1); assert.equal(store.browse("'; DROP TABLE todos").total, 0);
  assert.equal(store.list().todos.length, 10); assert.equal(store.list().total, 26);
});
test("dashboard HTTP routes return actual records and reject invalid search and unknown runs", async t => {
  const fixture = setup(t, async () => Response.json({ status: "ok" }));
  fixture.store.create("Synthetic dashboard task", "request-1");
  writeFileSync(join(fixture.runDirectory, "test-run.json"), '{"question":"Synthetic run","status":"completed"}');
  const app = createApp(fixture), get = path => app(new Request(`http://127.0.0.1:3210${path}`));
  const dashboard = await (await get("/api/dashboard")).json();
  assert.equal(dashboard.todos.total, 1); assert.equal(dashboard.activity.total, 1); assert.equal(dashboard.chat_busy, false);
  assert.equal((await get("/api/runs/test-run")).status, 200);
  for (const path of ["/api/runs/missing", "/api/runs/%2e%2e%2fprivate"]) assert.equal((await get(path)).status, 404);
  for (const page of ["-1", "1.5", "abc", "10001"]) assert.equal((await get(`/api/todos?view=page&page=${page}`)).status, 400);
  assert.equal((await (await get("/api/todos?view=page&q=Synthetic")).json()).total, 1);
});
