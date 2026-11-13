import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runChat } from "./agent.mjs";

const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
]);
const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createApp({ store, chat, dashboard, runDetails, transportLabel = "mlx-lm-local", saveTrace = () => {}, origin = "http://127.0.0.1:3210" }) {
  const sessions = new Map();
  const requests = new Map();
  const allowed = new Set([origin, origin.replace("127.0.0.1", "localhost")]);
  let busy = false;
  return async request => {
    const url = new URL(request.url);
    if (!allowed.has(url.origin)) return json({ error: "Unexpected local host." }, 403);
    if (request.method === "GET" && staticFiles.has(url.pathname)) {
      const [name, type] = staticFiles.get(url.pathname);
      return new Response(readFileSync(new URL(`./public/${name}`, import.meta.url)), { headers: {
        "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      } });
    }
    if (request.method === "GET" && url.pathname === "/api/todos") {
      if (url.searchParams.get("view") !== "page") return json(store.list());
      const query = url.searchParams.get("q") ?? "", page = Number(url.searchParams.get("page") ?? 0);
      if (query.length > 160 || !Number.isInteger(page) || page < 0 || page > 10000) return json({ error: "Invalid task search or page." }, 400);
      return json(store.browse(query, page));
    }
    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      if (!dashboard) return json({ error: "Dashboard service is not configured." }, 503);
      return json({ ...await dashboard(), chat_busy: busy });
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/runs/")) {
      const record = runDetails?.(url.pathname.slice("/api/runs/".length));
      return record ? json(record) : json({ error: "Saved run not found." }, 404);
    }
    if (request.method !== "POST" || url.pathname !== "/api/chat") return json({ error: "Route not found." }, 404);
    if (request.headers.get("origin") && request.headers.get("origin") !== url.origin) return json({ error: "Use this app from its local page." }, 403);
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return json({ error: "Expected application/json." }, 415);
    let body;
    try {
      const text = await request.text();
      if (Buffer.byteLength(text) > 8192) return json({ error: "Request is too large." }, 413);
      body = JSON.parse(text);
    } catch { return json({ error: "Invalid JSON." }, 400); }
    if (!body || !uuid.test(body.request_id) || !uuid.test(body.session_id) || typeof body.message !== "string" || !body.message.trim() || body.message.length > 1500) return json({ error: "Provide request_id, session_id and a message of 1–1500 characters." }, 400);
    const fingerprint = createHash("sha256").update(JSON.stringify([body.session_id, body.message])).digest("hex");
    const previous = requests.get(body.request_id);
    if (previous) return previous.fingerprint === fingerprint ? json(await previous.promise) : json({ error: "This request ID belongs to a different message." }, 409);
    if (busy) return json({ error: "One chat is already running. Wait for its result." }, 429);
    busy = true;
    const promise = (async () => {
      try {
        const turns = sessions.get(body.session_id) ?? [];
        const history = [];
        for (const turn of [...turns].reverse()) {
          if (JSON.stringify([...turn, ...history]).length > 3000) break;
          history.unshift(...turn);
        }
        const { report, conversation } = await runChat({ message: body.message.trim(), history, requestId: body.request_id, store, chat, transportLabel,
          contextMetadata: { session_id: body.session_id, retained_exchanges: turns.length,
            history_character_budget: 3000, maximum_retained_exchanges: 2, history_persistent: false } });
        if (report.status === "completed") {
          if (!sessions.has(body.session_id) && sessions.size >= 10) sessions.delete(sessions.keys().next().value);
          sessions.set(body.session_id, [...turns, conversation].slice(-2));
        }
        try { await saveTrace(report); report.trace_saved = true; }
        catch (error) { report.trace_saved = false; report.trace_save_error = error.message; }
        return report;
      } finally { busy = false; }
    })();
    requests.set(body.request_id, { fingerprint, promise });
    if (requests.size > 100) requests.delete(requests.keys().next().value);
    return json(await promise);
  };
}
