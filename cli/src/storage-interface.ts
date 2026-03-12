/**
 * Storage Adapter Interface for Cognetivy
 * 
 * Abstracts storage layer to support:
 * - FileStorageAdapter: Local .cognetivy/ files (current behavior)
 * - PlaneStorageAdapter: Sync to Plane API
 */

import type {
  WorkflowIndexRecord,
  WorkflowRecord,
  WorkflowVersionRecord,
  RunRecord,
  EventPayload,
  CollectionSchemaConfig,
  CollectionItem,
  CollectionStore,
  NodeResultRecord,
} from './models.js';

/**
 * Base storage adapter interface.
 * All methods are async to support both file and API storage.
 */
export interface IStorageAdapter {
  // Workflow operations
  readWorkflowIndex(): Promise<WorkflowIndexRecord>;
  writeWorkflowIndex(index: WorkflowIndexRecord): Promise<void>;
  listWorkflows(): Promise<WorkflowRecord[]>;
  readWorkflowRecord(workflowId: string): Promise<WorkflowRecord>;
  writeWorkflowRecord(workflow: WorkflowRecord): Promise<void>;
  
  // Workflow version operations
  readWorkflowVersion(workflowId: string, versionId: string): Promise<WorkflowVersionRecord>;
  writeWorkflowVersion(version: WorkflowVersionRecord): Promise<void>;
  listWorkflowVersions(workflowId: string): Promise<WorkflowVersionRecord[]>;
  
  // Run operations
  createRun(run: RunRecord): Promise<void>;
  readRun(runId: string): Promise<RunRecord>;
  updateRun(run: RunRecord): Promise<void>;
  listRuns(workflowId?: string): Promise<RunRecord[]>;
  
  // Event operations
  appendEvent(runId: string, event: EventPayload): Promise<void>;
  listEvents(runId: string): Promise<EventPayload[]>;
  
  // Collection operations
  readCollectionSchema(workflowId: string): Promise<CollectionSchemaConfig>;
  writeCollectionSchema(schema: CollectionSchemaConfig): Promise<void>;
  
  readCollection(runId: string, kind: string): Promise<CollectionStore>;
  writeCollection(runId: string, kind: string, collection: CollectionStore): Promise<void>;
  appendCollectionItem(runId: string, kind: string, item: CollectionItem): Promise<void>;
  
  // Node result operations
  readNodeResult(runId: string, nodeId: string): Promise<NodeResultRecord | null>;
  writeNodeResult(runId: string, nodeId: string, result: NodeResultRecord): Promise<void>;
  listNodeResults(runId: string): Promise<NodeResultRecord[]>;
  
  // Sync operations (for Plane adapter)
  sync?(): Promise<SyncResult>;
}

export interface SyncResult {
  workflowsSynced: number;
  runsSynced: number;
  collectionsSynced: number;
  errors: SyncError[];
}

export interface SyncError {
  type: 'workflow' | 'run' | 'collection' | 'event' | 'node_result';
  id: string;
  error: string;
}

/**
 * Configuration for storage adapters
 */
export interface StorageConfig {
  type: 'file' | 'plane' | 'hybrid';
  
  // File adapter config
  workspaceDir?: string;
  
  // Plane adapter config
  planeApiUrl?: string;
  planeApiKey?: string;
  planeWorkspace?: string;
  planeProject?: string;
  
  // Hybrid config (sync to both)
  primaryAdapter?: 'file' | 'plane';
  syncOnWrite?: boolean;
}

/**
 * Create appropriate storage adapter based on config
 * 
 * Note: Import the adapter classes from their respective modules before calling this function.
 */
export async function createStorageAdapter(config: StorageConfig): Promise<IStorageAdapter> {
  // Dynamic import to avoid circular dependencies
  const { FileStorageAdapter } = await import('./adapters/file-adapter.js');
  const { PlaneStorageAdapter } = await import('./adapters/plane-adapter.js');
  const { HybridStorageAdapter } = await import('./adapters/hybrid-adapter.js');
  
  switch (config.type) {
    case 'file':
      return new FileStorageAdapter(config.workspaceDir);
    case 'plane':
      return new PlaneStorageAdapter(
        config.planeApiUrl!,
        config.planeApiKey!,
        config.planeWorkspace!,
        config.planeProject!
      );
    case 'hybrid':
      return new HybridStorageAdapter(
        new FileStorageAdapter(config.workspaceDir),
        new PlaneStorageAdapter(
          config.planeApiUrl!,
          config.planeApiKey!,
          config.planeWorkspace!,
          config.planeProject!
        ),
        config.primaryAdapter || 'file',
        config.syncOnWrite ?? true
      );
    default:
      throw new Error(`Unknown storage adapter type: ${config.type}`);
  }
}