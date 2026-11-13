import { createServer } from "node:http";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { openStore } from "./store.mjs";
import { createApp } from "./app.mjs";

const port = Number(process.env.TODO_PORT ?? 3210);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("TODO_PORT must be an integer from 1024 to 65535.");
const directory = new URL("./data/", import.meta.url);
mkdirSync(new URL("./runs/", directory), { recursive: true });
const store = openStore(fileURLToPath(new URL("./todos.sqlite", directory)));
const sources = Object.fromEntries(["server.mjs", "app.mjs", "agent.mjs", "tools.mjs", "store.mjs", "public/index.html", "public/app.js", "public/style.css"].map(name => [name, createHash("sha256").update(readFileSync(new URL(name, import.meta.url))).digest("hex")]));
const origin = `http://127.0.0.1:${port}`;
const app = createApp({ store, origin, saveTrace(report) {
  writeFileSync(new URL(`./runs/${report.request_id}.json`, directory), JSON.stringify({ ...report, source_sha256: sources, runtime: process.version }, null, 2) + "\n", { flag: "wx" });
} });
const server = createServer(async (req, res) => {
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 8192) { res.writeHead(413); res.end("Request is too large."); return; }
      chunks.push(chunk);
    }
    const method = req.method ?? "GET";
    const request = new Request(`http://${req.headers.host}${req.url}`, { method, headers: req.headers, ...(method === "GET" || method === "HEAD" ? {} : { body: Buffer.concat(chunks) }) });
    const response = await app(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: error.message })); }
});
server.on("error", error => {
  console.error(JSON.stringify({ status: "server_start_failed", code: error.code, message: error.message }));
  store.close(); process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => console.log(`Qwen Todo Lab: ${origin}\nLocal only. First slice: create + list. Traces: data/runs/`));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close(() => { store.close(); process.exit(0); }));
