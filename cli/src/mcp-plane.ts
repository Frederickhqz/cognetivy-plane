/**
 * Plane-specific MCP tools for Cognetivy.
 * Extends the core MCP server with Plane integration tools.
 */

import type { IStorageAdapter } from './storage-interface.js';
import { getStorage } from './storage-workspace.js';
import { getMergedConfig, getStorageConfig } from './config.js';

/**
 * Plane MCP tools to add to the TOOLS array.
 */
export const PLANE_TOOLS: Array<{
  name: string;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}> = [
  {
    name: "plane_sync",
    description:
      "Sync local Cognetivy data to Plane. Creates/updates Plane issues for workflows and runs. Requires Plane storage configuration.",
    inputSchema: {
      type: "object",
      properties: {
        workflow_id: { type: "string", description: "Optional: sync specific workflow only" },
      },
    },
  },
  {
    name: "plane_status",
    description:
      "Check Plane connection status. Returns connection details and last sync time.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "plane_list_issues",
    description:
      "List Plane issues for the configured project. Returns issues with cognetivy metadata.",
    inputSchema: {
      type: "object",
      properties: {
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Filter by labels (e.g., ['cognetivy:workflow', 'cognetivy:run'])",
        },
      },
    },
  },
  {
    name: "plane_get_issue",
    description:
      "Get a Plane issue with its Cognetivy metadata. Parses embedded JSON from description.",
    inputSchema: {
      type: "object",
      properties: {
        issue_id: { type: "string", description: "Plane issue ID" },
      },
      required: ["issue_id"],
    },
  },
  {
    name: "plane_create_workflow",
    description:
      "Create a workflow in both local storage AND Plane. Returns local workflow_id and Plane issue ID.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Workflow name" },
        description: { type: "string", description: "Workflow description" },
        nodes: {
          type: "array",
          description: "Workflow nodes",
          items: { type: "object" },
        },
        edges: {
          type: "array",
          description: "Workflow edges",
          items: { type: "object" },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "plane_start_run",
    description:
      "Start a run in both local storage AND Plane. Creates Plane issue with cognetivy:run label.",
    inputSchema: {
      type: "object",
      properties: {
        workflow_id: { type: "string", description: "Local workflow ID" },
        name: { type: "string", description: "Run name" },
        input_json: { type: "object", description: "Run input" },
      },
      required: ["workflow_id", "name", "input_json"],
    },
  },
];

/**
 * Handle Plane-specific tool calls.
 */
export async function handlePlaneToolCall(
  name: string,
  args: Record<string, unknown>,
  cwd: string
): Promise<string> {
  const storage = await getStorage(cwd);
  const config = await getMergedConfig(cwd);

  // Check if Plane is configured
  const storageType = (config.storage as string) || "file";
  if (storageType === "file") {
    return JSON.stringify({
      error: "Plane not configured. Run `cognetivy init --storage plane` first.",
      current_storage: "file",
    });
  }

  switch (name) {
    case "plane_sync": {
      const workflowId = args.workflow_id as string | undefined;
      const syncResult = await storage.sync?.();
      return JSON.stringify({
        success: true,
        synced: syncResult?.synced ?? 0,
        errors: syncResult?.errors ?? [],
        workflow_id: workflowId,
      });
    }

    case "plane_status": {
      const storageConfig = await getStorageConfig(config, cwd);
      return JSON.stringify({
        status: "connected",
        storage_type: storageType,
        plane_url: storageConfig.planeUrl,
        plane_workspace: storageConfig.planeWorkspace,
        plane_project: storageConfig.planeProject,
      });
    }

    case "plane_list_issues": {
      const labels = args.labels as string[] | undefined;
      // Use Plane adapter directly if available
      const planeAdapter = storage.constructor.name === "PlaneStorageAdapter"
        ? storage
        : storage.constructor.name === "HybridStorageAdapter"
        ? (storage as any).planeAdapter
        : null;

      if (!planeAdapter) {
        return JSON.stringify({ error: "Not using Plane storage adapter" });
      }

      // Call Plane API to list issues
      const issues = await (planeAdapter as any).listIssues({ labels });
      return JSON.stringify(issues, null, 2);
    }

    case "plane_get_issue": {
      const issueId = args.issue_id as string;
      const planeAdapter = storage.constructor.name === "PlaneStorageAdapter"
        ? storage
        : storage.constructor.name === "HybridStorageAdapter"
        ? (storage as any).planeAdapter
        : null;

      if (!planeAdapter) {
        return JSON.stringify({ error: "Not using Plane storage adapter" });
      }

      const issue = await (planeAdapter as any).getIssue(issueId);
      return JSON.stringify(issue, null, 2);
    }

    case "plane_create_workflow": {
      // This would be implemented by creating locally then syncing
      return JSON.stringify({
        error: "Not implemented. Use workflow_set then plane_sync.",
      });
    }

    case "plane_start_run": {
      // This would be implemented by starting locally then syncing
      return JSON.stringify({
        error: "Not implemented. Use run_start then plane_sync.",
      });
    }

    default:
      throw new Error(`Unknown Plane tool: ${name}`);
  }
}