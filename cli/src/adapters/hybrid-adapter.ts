/**
 * Hybrid Storage Adapter for Cognetivy
 * 
 * Syncs between local file storage and Plane API.
 * Primary storage is local, secondary is Plane.
 * On write: writes local first, then syncs to Plane.
 * On read: reads from local (Plane is backup).
 */

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
import type { IStorageAdapter, SyncResult, SyncError } from '../storage-interface.js';

export class HybridStorageAdapter implements IStorageAdapter {
  private fileAdapter: IStorageAdapter;
  private planeAdapter: IStorageAdapter;
  private primary: 'file' | 'plane';
  private syncOnWrite: boolean;

  constructor(
    fileAdapter: IStorageAdapter,
    planeAdapter: IStorageAdapter,
    primary: 'file' | 'plane' = 'file',
    syncOnWrite: boolean = true
  ) {
    this.fileAdapter = fileAdapter;
    this.planeAdapter = planeAdapter;
    this.primary = primary;
    this.syncOnWrite = syncOnWrite;
  }

  // ============ Workflow Operations ============

  async readWorkflowIndex(): Promise<WorkflowIndexRecord> {
    const adapter = this.primary === 'file' ? this.fileAdapter : this.planeAdapter;
    return adapter.readWorkflowIndex();
  }

  async writeWorkflowIndex(index: WorkflowIndexRecord): Promise<void> {
    // Write to primary first
    const primaryAdapter = this.primary === 'file' ? this.fileAdapter : this.planeAdapter;
    await primaryAdapter.writeWorkflowIndex(index);
    
    // Sync to secondary if enabled
    if (this.syncOnWrite) {
      const secondaryAdapter = this.primary === 'file' ? this.planeAdapter : this.fileAdapter;
      try {
        await secondaryAdapter.writeWorkflowIndex(index);
      } catch (error) {
        // Log error but don't fail primary write
        console.error('Failed to sync workflow index to secondary:', error);
      }
    }
  }

  async listWorkflows(): Promise<WorkflowRecord[]> {
    return this.fileAdapter.listWorkflows();
  }

  async readWorkflowRecord(workflowId: string): Promise<WorkflowRecord> {
    return this.fileAdapter.readWorkflowRecord(workflowId);
  }

  async writeWorkflowRecord(workflow: WorkflowRecord): Promise<void> {
    await this.fileAdapter.writeWorkflowRecord(workflow);
    
    if (this.syncOnWrite) {
      try {
        await this.planeAdapter.writeWorkflowRecord(workflow);
      } catch (error) {
        console.error('Failed to sync workflow to Plane:', error);
      }
    }
  }

  // ============ Workflow Version Operations ============

  async readWorkflowVersion(workflowId: string, versionId: string): Promise<WorkflowVersionRecord> {
    return this.fileAdapter.readWorkflowVersion(workflowId, versionId);
  }

  async writeWorkflowVersion(version: WorkflowVersionRecord): Promise<void> {
    await this.fileAdapter.writeWorkflowVersion(version);
    
    if (this.syncOnWrite) {
      try {
        await this.planeAdapter.writeWorkflowVersion(version);
      } catch (error) {
        console.error('Failed to sync workflow version to Plane:', error);
      }
    }
  }

  async listWorkflowVersions(workflowId: string): Promise<WorkflowVersionRecord[]> {
    return this.fileAdapter.listWorkflowVersions(workflowId);
  }

  // ============ Run Operations ============

  async createRun(run: RunRecord): Promise<void> {
    await this.fileAdapter.createRun(run);
    
    if (this.syncOnWrite) {
      try {
        await this.planeAdapter.createRun(run);
      } catch (error) {
        console.error('Failed to sync run to Plane:', error);
      }
    }
  }

  async readRun(runId: string): Promise<RunRecord> {
    return this.fileAdapter.readRun(runId);
  }

  async updateRun(run: RunRecord): Promise<void> {
    await this.fileAdapter.updateRun(run);
    
    if (this.syncOnWrite) {
      try {
        await this.planeAdapter.updateRun(run);
      } catch (error) {
        console.error('Failed to sync run update to Plane:', error);
      }
    }
  }

  async listRuns(workflowId?: string): Promise<RunRecord[]> {
    return this.fileAdapter.listRuns(workflowId);
  }

  // ============ Event Operations ============

  async appendEvent(runId: string, event: EventPayload): Promise<void> {
    await this.fileAdapter.appendEvent(runId, event);
    
    if (this.syncOnWrite) {
      try {
        await this.planeAdapter.appendEvent(runId, event);
      } catch (error) {
        console.error('Failed to sync event to Plane:', error);
      }
    }
  }

  async listEvents(runId: string): Promise<EventPayload[]> {
    return this.fileAdapter.listEvents(runId);
  }

  // ============ Collection Operations ============

  async readCollectionSchema(workflowId: string): Promise<CollectionSchemaConfig> {
    return this.fileAdapter.readCollectionSchema(workflowId);
  }

  async writeCollectionSchema(schema: CollectionSchemaConfig): Promise<void> {
    await this.fileAdapter.writeCollectionSchema(schema);
    
    if (this.syncOnWrite) {
      try {
        await this.planeAdapter.writeCollectionSchema(schema);
      } catch (error) {
        console.error('Failed to sync collection schema to Plane:', error);
      }
    }
  }

  async readCollection(runId: string, kind: string): Promise<CollectionStore> {
    return this.fileAdapter.readCollection(runId, kind);
  }

  async writeCollection(runId: string, kind: string, collection: CollectionStore): Promise<void> {
    await this.fileAdapter.writeCollection(runId, kind, collection);
    
    if (this.syncOnWrite) {
      try {
        await this.planeAdapter.writeCollection(runId, kind, collection);
      } catch (error) {
        console.error('Failed to sync collection to Plane:', error);
      }
    }
  }

  async appendCollectionItem(runId: string, kind: string, item: CollectionItem): Promise<void> {
    await this.fileAdapter.appendCollectionItem(runId, kind, item);
    
    if (this.syncOnWrite) {
      try {
        await this.planeAdapter.appendCollectionItem(runId, kind, item);
      } catch (error) {
        console.error('Failed to sync collection item to Plane:', error);
      }
    }
  }

  // ============ Node Result Operations ============

  async readNodeResult(runId: string, nodeId: string): Promise<NodeResultRecord | null> {
    return this.fileAdapter.readNodeResult(runId, nodeId);
  }

  async writeNodeResult(runId: string, nodeId: string, result: NodeResultRecord): Promise<void> {
    await this.fileAdapter.writeNodeResult(runId, nodeId, result);
    
    if (this.syncOnWrite) {
      try {
        await this.planeAdapter.writeNodeResult(runId, nodeId, result);
      } catch (error) {
        console.error('Failed to sync node result to Plane:', error);
      }
    }
  }

  async listNodeResults(runId: string): Promise<NodeResultRecord[]> {
    return this.fileAdapter.listNodeResults(runId);
  }

  // ============ Sync Operations ============

  /**
   * Sync all local data to Plane.
   * Useful for initial sync or recovery.
   */
  async sync(): Promise<SyncResult> {
    const result: SyncResult = {
      workflowsSynced: 0,
      runsSynced: 0,
      collectionsSynced: 0,
      errors: [],
    };

    // Sync all workflows
    try {
      const workflows = await this.fileAdapter.listWorkflows();
      for (const workflow of workflows) {
        try {
          await this.planeAdapter.writeWorkflowRecord(workflow);
          result.workflowsSynced++;
        } catch (error) {
          result.errors.push({
            type: 'workflow',
            id: workflow.workflow_id,
            error: String(error),
          });
        }
      }
    } catch (error) {
      result.errors.push({
        type: 'workflow',
        id: 'all',
        error: `Failed to list workflows: ${error}`,
      });
    }

    // Sync all runs
    try {
      const runs = await this.fileAdapter.listRuns();
      for (const run of runs) {
        try {
          await this.planeAdapter.createRun(run);
          result.runsSynced++;
        } catch (error) {
          result.errors.push({
            type: 'run',
            id: run.run_id,
            error: String(error),
          });
        }
      }
    } catch (error) {
      result.errors.push({
        type: 'run',
        id: 'all',
        error: `Failed to list runs: ${error}`,
      });
    }

    // Note: Collections and events are synced on write, not here

    return result;
  }
}