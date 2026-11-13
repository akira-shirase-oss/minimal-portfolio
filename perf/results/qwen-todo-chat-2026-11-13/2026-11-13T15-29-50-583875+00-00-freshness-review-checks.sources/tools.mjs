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

export function executeTool(store, requestId, name, args) {
  const error = (code, message) => ({ error: { code, message } });
  if (!tools.some(tool => tool.function.name === name)) return error("UNKNOWN_TOOL", "Only create_todo and list_todos are available.");
  if (!args || typeof args !== "object" || Array.isArray(args)) return error("INVALID_ARGUMENTS", "Tool arguments must be an object.");
  if (name === "list_todos") return Object.keys(args).length === 0 ? store.list() : error("INVALID_ARGUMENTS", "list_todos takes exactly {}.");
  if (Object.keys(args).length !== 1 || typeof args.title !== "string" || !args.title.trim() || args.title.trim().length > 160) {
    return error("INVALID_ARGUMENTS", "create_todo needs exactly one nonempty title of at most 160 characters.");
  }
  return store.create(args.title.trim(), requestId);
}
