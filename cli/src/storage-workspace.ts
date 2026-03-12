/**
 * Storage-aware workspace functions
 * 
 * Wraps workspace functions to use IStorageAdapter.
 * Maintains backward compatibility with existing code.
 */

import type { StorageConfig, IStorageAdapter } from './storage-interface.js';
import { createStorageAdapter } from './storage-interface.js';
import { FileStorageAdapter } from './adapters/file-adapter.js';
import { getMergedConfig, getStorageConfig } from './config.js';

// Storage adapter instance (singleton)
let storageAdapter: IStorageAdapter | null = null;

/**
 * Get the storage adapter instance.
 * Creates it lazily based on config.
 */
export async function getStorage(cwd?: string): Promise<IStorageAdapter> {
  if (!storageAdapter) {
    const config = await getMergedConfig(cwd);
    const storageConfig = await getStorageConfig(config, cwd);
    storageAdapter = await createStorageAdapter(storageConfig);
  }
  return storageAdapter;
}

/**
 * Reset storage adapter (useful for testing).
 */
export function resetStorage() {
  storageAdapter = null;
}

// Re-export all workspace functions with storage adapter integration
// These will be gradually migrated to use the storage adapter

export {
  // Path helpers (unchanged)
  getWorkspaceRoot,
  getWorkspacePaths,
  workspaceExists,
  requireWorkspace,
  ensureWorkspace,
  
  // Workflow operations (will use storage adapter)
  readWorkflowIndex,
  writeWorkflowIndex,
  listWorkflows,
  readWorkflowRecord,
  writeWorkflowRecord,
  listWorkflowVersionIds,
  readWorkflowVersionRecord,
  writeWorkflowVersionRecord,
  
  // Run operations
  writeRunFile,
  readRunFile,
  updateRunFile,
  appendEventLine,
  runExists,
  
  // Collection operations
  readCollectionSchema,
  writeCollectionSchema,
  listCollectionKindsForRun,
  readCollections,
  writeCollections,
  appendCollection,
  
  // Node result operations
  listNodeResults,
  readNodeResult,
  writeNodeResult,
} from './workspace.js';

/**
 * Initialize workspace with storage configuration.
 * Writes .cognetivy/config.json with storage settings.
 */
export async function initWorkspaceWithStorage(
  cwd: string = process.cwd(),
  options: {
    storage?: 'file' | 'plane' | 'hybrid';
    planeUrl?: string;
    planeKey?: string;
    planeWorkspace?: string;
    planeProject?: string;
  } = {}
): Promise<void> {
  const { ensureWorkspace } = await import('./workspace.js');
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  
  // Ensure workspace exists
  await ensureWorkspace(cwd);
  
  // Build config
  const config: Record<string, unknown> = {};
  
  if (options.storage) {
    config.storage = options.storage;
  }
  
  if (options.storage === 'plane' || options.storage === 'hybrid') {
    config.plane = {
      apiUrl: options.planeUrl,
      apiKey: options.planeKey,
      workspace: options.planeWorkspace,
      project: options.planeProject,
    };
  }
  
  // Write config
  if (Object.keys(config).length > 0) {
    const configPath = join(cwd, '.cognetivy', 'config.json');
    mkdirSync(join(cwd, '.cognetivy'), { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

/**
 * Sync local data to Plane.
 * Only available for hybrid storage.
 */
export async function syncToPlane(cwd?: string): Promise<{
  workflowsSynced: number;
  runsSynced: number;
  collectionsSynced: number;
  errors: Array<{ type: string; id: string; error: string }>;
}> {
  const storage = await getStorage(cwd);
  
  if (typeof storage.sync !== 'function') {
    throw new Error('sync() is only available for hybrid storage. Use --storage hybrid');
  }
  
  return storage.sync();
}

/**
 * Test Plane connection.
 */
export async function testPlaneConnection(
  apiUrl: string,
  apiKey: string,
  workspace: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/workspaces/${workspace}/`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });
    
    if (response.ok) {
      return { success: true };
    }
    
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}