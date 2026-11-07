import { readFileSync } from "node:fs";

const notes = JSON.parse(readFileSync(new URL("./project-notes.json", import.meta.url), "utf8"));

export const tool = {
  type: "function",
  function: {
    name: "lookup_project",
    description: "Read a saved project note containing its build/deployment facts. Available project: portfolio.",
    parameters: {
      type: "object",
      properties: { project_name: { type: "string", enum: ["portfolio"] } },
      required: ["project_name"],
      additionalProperties: false,
    },
  },
};

export function executeTool(name, args) {
  if (name !== "lookup_project") return { error: "Unknown tool. Only lookup_project is available." };
  if (!args || typeof args !== "object" || Array.isArray(args) ||
      Object.keys(args).length !== 1 || args.project_name !== "portfolio") {
    return { error: 'Expected exactly {"project_name":"portfolio"}.' };
  }
  // The model supplies a project identifier, never a file path or shell command.
  return { note: notes.portfolio };
}
