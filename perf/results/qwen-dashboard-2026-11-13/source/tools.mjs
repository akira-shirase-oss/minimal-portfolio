import { performance } from "node:perf_hooks";

export const tools = [
  { type: "function", function: {
    name: "create_todo", description: "Create one todo explicitly requested by the user. One distinct creation per user request. Returns the saved ID and title; repeated identical calls in that request return the original result.",
    parameters: { type: "object", properties: { title: { type: "string", minLength: 1, maxLength: 160 } }, required: ["title"], additionalProperties: false },
  } },
  { type: "function", function: {
    name: "list_todos", description: "Read up to ten saved todos in ID order, with the total count and has_more. Use the result instead of guessing what exists.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  } },
];

export function executeTool(store, requestId, name, args, observe = () => {}) {
  const started = performance.now();
  const error = (code, message) => {
    const result = { error: { code, message } };
    observe({ kind: "tool_validation", name, status: "rejected", duration_ms: performance.now() - started, ...result });
    return result;
  };
  if (!tools.some(tool => tool.function.name === name)) return error("UNKNOWN_TOOL", "Only create_todo and list_todos are available.");
  if (!args || typeof args !== "object" || Array.isArray(args)) return error("INVALID_ARGUMENTS", "Tool arguments must be an object.");
  if (name === "list_todos" && Object.keys(args).length !== 0) return error("INVALID_ARGUMENTS", "list_todos takes exactly {}.");
  if (name === "create_todo" && (Object.keys(args).length !== 1 || typeof args.title !== "string" || !args.title.trim() || args.title.trim().length > 160)) {
    return error("INVALID_ARGUMENTS", "create_todo needs exactly one nonempty title of at most 160 characters.");
  }
  observe({ kind: "tool_validation", name, status: "passed", duration_ms: performance.now() - started });
  const databaseStarted = performance.now();
  try {
    const result = name === "list_todos" ? store.list() : store.create(args.title.trim(), requestId);
    observe({ kind: "database_result", name, operation: name === "list_todos" ? "read" : "create",
      status: result.error ? "rejected" : "completed", duration_ms: performance.now() - databaseStarted,
      rows_changed: name === "create_todo" && !result.error && !result.replayed ? 1 : 0, result });
    return result;
  } catch (failure) {
    observe({ kind: "database_result", name, status: "failed", duration_ms: performance.now() - databaseStarted, error: { message: failure.message } });
    throw failure;
  }
}
