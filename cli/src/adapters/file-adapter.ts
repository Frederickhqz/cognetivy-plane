/**
 * File Storage Adapter for Cognetivy
 * 
 * Original file-based storage implementation.
 * Stores all data in .cognetivy/ directory.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  WorkflowIndexRecord,
  WorkflowRecord,
  WorkflowVersionRecord,
  RunRecord,
  EventPayload,
  CollectionSchemaConfig,
  CollectionStore,
  CollectionItem,
  NodeResultRecord,
} from '../models.js';
import type { IStorageAdapter } from '../storage-interface.js';

// Re-export constants from workspace.ts for compatibility
export const WORKSPACE_DIR = '.cognetivy';
export const WORKFLOWS_DIR = 'workflows';
export const WORKFLOWS_INDEX_JSON = 'index.json';
export const WORKFLOW_JSON = 'workflow.json';
export const WORKFLOW_VERSIONS_DIR = 'versions';
export const WORKFLOW_COLLECTIONS_DIR = 'collections';
export const WORKFLOW_COLLECTION_SCHEMA_JSON = 'schema.json';
export const RUNS_DIR = 'runs';
export const EVENTS_DIR = 'events';
export const COLLECTIONS_DIR = 'collections';
export const NODE_RESULTS_DIR = 'node-results';

export class FileStorageAdapter implements IStorageAdapter {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  // ============ Path Helpers ============

  private getWorkspaceRoot(): string {
    return path.join(this.cwd, WORKSPACE_DIR);
  }

  private getWorkflowsDir(): string {
    return path.join(this.getWorkspaceRoot(), WORKFLOWS_DIR);
  }

  private getWorkflowsIndexPath(): string {
    return path.join(this.getWorkflowsDir(), WORKFLOWS_INDEX_JSON);
  }

  private getWorkflowDir(workflowId: string): string {
    return path.join(this.getWorkflowsDir(), workflowId);
  }

  private getWorkflowRecordPath(workflowId: string): string {
    return path.join(this.getWorkflowDir(workflowId), WORKFLOW_JSON);
  }

  private getWorkflowVersionsDir(workflowId: string): string {
    return path.join(this.getWorkflowDir(workflowId), WORKFLOW_VERSIONS_DIR);
  }

  private getWorkflowVersionPath(workflowId: string, versionId: string): string {
    return path.join(this.getWorkflowVersionsDir(workflowId), `${versionId}.json`);
  }

  private getWorkflowCollectionsDir(workflowId: string): string {
    return path.join(this.getWorkflowDir(workflowId), WORKFLOW_COLLECTIONS_DIR);
  }

  private getWorkflowCollectionSchemaPath(workflowId: string): string {
    return path.join(this.getWorkflowCollectionsDir(workflowId), WORKFLOW_COLLECTION_SCHEMA_JSON);
  }

  private getRunsDir(): string {
    return path.join(this.getWorkspaceRoot(), RUNS_DIR);
  }

  private getRunDir(runId: string): string {
    return path.join(this.getRunsDir(), runId);
  }

  private getRunRecordPath(runId: string): string {
    return path.join(this.getRunDir(runId), 'run.json');
  }

  private getEventsPath(runId: string): string {
    return path.join(this.getRunDir(runId), EVENTS_DIR, 'events.ndjson');
  }

  private getCollectionsDir(runId: string): string {
    return path.join(this.getRunDir(runId), COLLECTIONS_DIR);
  }

  private getCollectionPath(runId: string, kind: string): string {
    return path.join(this.getCollectionsDir(runId), `${kind}.json`);
  }

  private getNodeResultsDir(runId: string): string {
    return path.join(this.getRunDir(runId), NODE_RESULTS_DIR);
  }

  private getNodeResultPath(runId: string, nodeId: string): string {
    return path.join(this.getNodeResultsDir(runId), `${nodeId}.json`);
  }

  // ============ Workflow Operations ============

  async readWorkflowIndex(): Promise<WorkflowIndexRecord> {
    const filePath = this.getWorkflowsIndexPath();
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  }

  async writeWorkflowIndex(index: WorkflowIndexRecord): Promise<void> {
    const filePath = this.getWorkflowsIndexPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(index, null, 2), 'utf-8');
  }

  async listWorkflows(): Promise<WorkflowRecord[]> {
    const index = await this.readWorkflowIndex();
    const workflows: WorkflowRecord[] = [];
    
    for (const summary of index.workflows) {
      try {
        const record = await this.readWorkflowRecord(summary.workflow_id);
        workflows.push(record);
      } catch {
        // Skip workflows that can't be read
      }
    }
    
    return workflows;
  }

  async readWorkflowRecord(workflowId: string): Promise<WorkflowRecord> {
    const filePath = this.getWorkflowRecordPath(workflowId);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  }

  async writeWorkflowRecord(workflow: WorkflowRecord): Promise<void> {
    const filePath = this.getWorkflowRecordPath(workflow.workflow_id);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf-8');
  }

  // ============ Workflow Version Operations ============

  async readWorkflowVersion(workflowId: string, versionId: string): Promise<WorkflowVersionRecord> {
    const filePath = this.getWorkflowVersionPath(workflowId, versionId);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  }

  async writeWorkflowVersion(version: WorkflowVersionRecord): Promise<void> {
    const filePath = this.getWorkflowVersionPath(version.workflow_id, version.version_id);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(version, null, 2), 'utf-8');
  }

  async listWorkflowVersions(workflowId: string): Promise<WorkflowVersionRecord[]> {
    const versionsDir = this.getWorkflowVersionsDir(workflowId);
    const files = await fs.readdir(versionsDir);
    const versions: WorkflowVersionRecord[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const version = await this.readWorkflowVersion(workflowId, file.replace('.json', ''));
        versions.push(version);
      }
    }
    
    return versions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // ============ Run Operations ============

  async createRun(run: RunRecord): Promise<void> {
    const runDir = this.getRunDir(run.run_id);
    await fs.mkdir(runDir, { recursive: true });
    await fs.mkdir(path.join(runDir, EVENTS_DIR), { recursive: true });
    await fs.mkdir(path.join(runDir, COLLECTIONS_DIR), { recursive: true });
    await fs.mkdir(path.join(runDir, NODE_RESULTS_DIR), { recursive: true });
    
    const filePath = this.getRunRecordPath(run.run_id);
    await fs.writeFile(filePath, JSON.stringify(run, null, 2), 'utf-8');
  }

  async readRun(runId: string): Promise<RunRecord> {
    const filePath = this.getRunRecordPath(runId);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  }

  async updateRun(run: RunRecord): Promise<void> {
    const filePath = this.getRunRecordPath(run.run_id);
    await fs.writeFile(filePath, JSON.stringify(run, null, 2), 'utf-8');
  }

  async listRuns(workflowId?: string): Promise<RunRecord[]> {
    const runsDir = this.getRunsDir();
    
    try {
      const dirs = await fs.readdir(runsDir);
      const runs: RunRecord[] = [];
      
      for (const dir of dirs) {
        try {
          const run = await this.readRun(dir);
          if (!workflowId || run.workflow_id === workflowId) {
            runs.push(run);
          }
        } catch {
          // Skip invalid runs
        }
      }
      
      return runs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch {
      return [];
    }
  }

  // ============ Event Operations ============

  async appendEvent(runId: string, event: EventPayload): Promise<void> {
    const filePath = this.getEventsPath(runId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    const line = JSON.stringify(event) + '\n';
    await fs.appendFile(filePath, line, 'utf-8');
  }

  async listEvents(runId: string): Promise<EventPayload[]> {
    const filePath = this.getEventsPath(runId);
    
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const lines = raw.trim().split('\n').filter(Boolean);
      return lines.map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  // ============ Collection Operations ============

  async readCollectionSchema(workflowId: string): Promise<CollectionSchemaConfig> {
    const filePath = this.getWorkflowCollectionSchemaPath(workflowId);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  }

  async writeCollectionSchema(schema: CollectionSchemaConfig): Promise<void> {
    const filePath = this.getWorkflowCollectionSchemaPath(schema.workflow_id);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(schema, null, 2), 'utf-8');
  }

  async readCollection(runId: string, kind: string): Promise<CollectionStore> {
    const filePath = this.getCollectionPath(runId, kind);
    
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      // Return empty collection with defaults
      return {
        run_id: runId,
        workflow_id: '',
        workflow_version_id: '',
        kind,
        updated_at: new Date().toISOString(),
        items: [],
      };
    }
  }

  async writeCollection(runId: string, kind: string, collection: CollectionStore): Promise<void> {
    const filePath = this.getCollectionPath(runId, kind);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(collection, null, 2), 'utf-8');
  }

  async appendCollectionItem(runId: string, kind: string, item: CollectionItem): Promise<void> {
    const collection = await this.readCollection(runId, kind);
    collection.items.push(item);
    await this.writeCollection(runId, kind, collection);
  }

  // ============ Node Result Operations ============

  async readNodeResult(runId: string, nodeId: string): Promise<NodeResultRecord | null> {
    const filePath = this.getNodeResultPath(runId, nodeId);
    
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async writeNodeResult(runId: string, nodeId: string, result: NodeResultRecord): Promise<void> {
    const filePath = this.getNodeResultPath(runId, nodeId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
  }

  async listNodeResults(runId: string): Promise<NodeResultRecord[]> {
    const nodeResultsDir = this.getNodeResultsDir(runId);
    
    try {
      const files = await fs.readdir(nodeResultsDir);
      const results: NodeResultRecord[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const result = await this.readNodeResult(runId, file.replace('.json', ''));
          if (result) {
            results.push(result);
          }
        }
      }
      
      return results;
    } catch {
      return [];
    }
  }
}