# Cognetivy + Plane Integration Architecture

## Overview

Cognetivy is forked to add Plane sync capability while keeping local-first storage.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cognetivy CLI                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  workflow    │  │    run       │  │   mcp        │           │
│  │  commands    │  │   commands   │  │   server      │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                    │
│         └─────────────────┼──────────────────┘                    │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Storage Adapter Interface                     │   │
│  │  readWorkflowIndex()  writeWorkflowRecord()  createRun()  │   │
│  │  readRun()            updateRun()            listRuns()   │   │
│  │  appendEvent()        readCollection()      sync()        │   │
│  └────────────────────────────┬─────────────────────────────┘   │
│                               │                                  │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ FileStorage   │ │ PlaneStorage  │ │ HybridStorage │
    │   Adapter     │ │   Adapter     │ │   Adapter     │
    │               │ │               │ │               │
    │ .cognetivy/   │ │ Plane API     │ │ file + plane  │
    │ (local files) │ │ (issues)      │ │ (sync)        │
    └───────────────┘ └───────────────┘ └───────────────┘
            │                 │                 │
            ▼                 ▼                 ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │   Local FS    │ │  Plane API    │ │  Both +       │
    │   .json files │ │  (REST)       │ │  auto-sync    │
    └───────────────┘ └───────────────┘ └───────────────┘
```

## Data Model Mapping

```
Cognetivy                  Plane
────────────────────────────────────────────
Workflow (workflow.json) → Issue (type: workflow)
  - workflow_id           → issue.id
  - name                  → issue.name
  - description           → issue.description_html
  - current_version_id    → issue.extra_props.current_version_id

Run (run.json)           → Issue (type: workflow_run)
  - run_id                → issue.id
  - workflow_id           → issue.parent
  - status                → issue.state (running→in_progress, completed→done, failed→cancelled)
  - input                 → issue.description_html (JSON)
  - final_answer          → issue.extra_props.final_answer

Collection (*.json)      → Issue Comment
  - kind                  → data-kind attribute
  - items[]               → JSON in <pre><code>

Event (events.ndjson)    → Issue Comment
  - type                  → data-event-type attribute
  - ts                    → data-ts attribute
  - by                    → "by {agent}"
  - data                  → JSON in <pre><code>

Node Result (*.json)     → Issue Comment
  - node_id               → data-node-id attribute
  - status                → in comment JSON
  - output                → in comment JSON
```

## Storage Adapter Interface

```typescript
interface IStorageAdapter {
  // Workflow operations
  readWorkflowIndex(): Promise<WorkflowIndexRecord>;
  writeWorkflowIndex(index: WorkflowIndexRecord): Promise<void>;
  listWorkflows(): Promise<WorkflowRecord[]>;
  readWorkflowRecord(workflowId: string): Promise<WorkflowRecord>;
  writeWorkflowRecord(workflow: WorkflowRecord): Promise<void>;
  
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
  
  // Sync (for Hybrid/Plane adapters)
  sync?(): Promise<SyncResult>;
}
```

## Configuration

```typescript
interface StorageConfig {
  type: 'file' | 'plane' | 'hybrid';
  
  // File adapter
  workspaceDir?: string;  // defaults to cwd/.cognetivy
  
  // Plane adapter
  planeApiUrl?: string;    // e.g., http://168.231.69.92:54617
  planeApiKey?: string;    // API key for authentication
  planeWorkspace?: string; // workspace slug
  planeProject?: string;   // project ID
  
  // Hybrid config
  primaryAdapter?: 'file' | 'plane';  // defaults to 'file'
  syncOnWrite?: boolean;              // defaults to true
}
```

## Usage

```typescript
import { createStorageAdapter } from './storage-interface.js';

// File-only (current behavior)
const storage = createStorageAdapter({
  type: 'file',
  workspaceDir: process.cwd()
});

// Plane-only (cloud-based)
const storage = createStorageAdapter({
  type: 'plane',
  planeApiUrl: 'http://168.231.69.92:54617',
  planeApiKey: process.env.PLANE_API_KEY,
  planeWorkspace: 'agents',
  planeProject: 'acf7aa9b-9864-40e7-b68b-f8133a2a4f7a'
});

// Hybrid (local + sync)
const storage = createStorageAdapter({
  type: 'hybrid',
  workspaceDir: process.cwd(),
  planeApiUrl: 'http://168.231.69.92:54617',
  planeApiKey: process.env.PLANE_API_KEY,
  planeWorkspace: 'agents',
  planeProject: 'acf7aa9b-9864-40e7-b68b-f8133a2a4f7a',
  primaryAdapter: 'file',
  syncOnWrite: true
});
```

## CLI Integration

```bash
# Initialize with Plane sync
cognetivy init --storage hybrid --plane-url http://168.231.69.92:54617 --plane-key $PLANE_API_KEY --plane-workspace agents --plane-project PLANE

# Start a run (syncs to Plane automatically)
cognetivy run start --input input.json

# Manual sync
cognetivy sync
```

## Environment Variables

```bash
PLANE_API_URL=http://168.231.69.92:54617
PLANE_API_KEY=plane_api_xxx
PLANE_WORKSPACE=agents
PLANE_PROJECT=PLANE
```

## Files Modified

1. `cli/src/storage-interface.ts` - New: IStorageAdapter interface
2. `cli/src/adapters/file-adapter.ts` - New: FileStorageAdapter (extracted from workspace.ts)
3. `cli/src/adapters/plane-adapter.ts` - New: PlaneStorageAdapter
4. `cli/src/adapters/hybrid-adapter.ts` - New: HybridStorageAdapter
5. `cli/src/workspace.ts` - Modified: Use IStorageAdapter instead of direct file operations
6. `cli/src/cli.ts` - Modified: Add --storage, --plane-* flags
7. `cli/src/config.ts` - Modified: Add Plane configuration