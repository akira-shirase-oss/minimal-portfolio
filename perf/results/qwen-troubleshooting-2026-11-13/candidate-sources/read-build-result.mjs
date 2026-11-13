import { readFileSync } from "node:fs";

const results = JSON.parse(readFileSync(new URL("./build-results.json", import.meta.url), "utf8"));

export const buildResultTool = {
  type: "function",
  function: {
    name: "read_build_result",
    description: "Read a saved example build result for a named project. These are labelled synthetic teaching records, not live site status. Errors include retryable so the caller can decide whether to try again.",
    parameters: {
      type: "object",
      properties: { project_name: { type: "string", description: "The named project, e.g. portfolio." } },
      required: ["project_name"],
      additionalProperties: false,
    },
  },
};

// Each run owns its failure state. No model-supplied path or command is executed.
export function createBuildResultReader({ failOnce = false } = {}) {
  let failureInjected = false;
  return function readBuildResult(args) {
    if (!args || typeof args !== "object" || Array.isArray(args) ||
        Object.keys(args).length !== 1 || typeof args.project_name !== "string" ||
        args.project_name.trim() === "") {
      return { error: { code: "INVALID_ARGUMENTS", message: 'Expected exactly {"project_name":"<project name>"}.', retryable: false } };
    }
    if (!Object.hasOwn(results, args.project_name)) {
      return { error: { code: "NOT_FOUND", message: "No saved build example for this project.", retryable: false }, available_projects: Object.keys(results) };
    }
    if (failOnce && !failureInjected) {
      failureInjected = true;
      return { error: { code: "TEMPORARY_UNAVAILABLE", message: "Injected teaching failure: saved build reader temporarily unavailable.", retryable: true, injected: true } };
    }
    return { build: structuredClone(results[args.project_name]) };
  };
}
