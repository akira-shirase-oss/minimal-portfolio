import { readFileSync } from "node:fs";

const notes = JSON.parse(readFileSync(new URL("./project-notes.json", import.meta.url), "utf8"));

export const tool = {
  type: "function",
  function: {
    name: "lookup_project",
    description: "Read a saved project note containing its build/deployment facts. Returns an error listing available projects when no note is saved for the requested name.",
    parameters: {
      type: "object",
      properties: { project_name: { type: "string", description: "The project name from the user's question." } },
      required: ["project_name"],
      additionalProperties: false,
    },
  },
};

export function executeTool(name, args) {
  if (name !== "lookup_project") return { error: "Unknown tool. Only lookup_project is available." };
  if (!args || typeof args !== "object" || Array.isArray(args) ||
      Object.keys(args).length !== 1 || typeof args.project_name !== "string" ||
      args.project_name.trim() === "") {
    return { error: 'Expected exactly {"project_name":"<project name>"}.' };
  }
  // The model supplies a project identifier, never a file path or shell command.
  const note = notes[args.project_name];
  if (!note) return { error: `No saved note for project "${args.project_name}".`, available_projects: Object.keys(notes) };
  return { note };
}
