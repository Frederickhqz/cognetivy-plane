# SKILL.md - Cognetivy Integration

## Description
Execute Cognetivy workflows through MCP server. Create, run, and manage workflow runs with step-by-step execution.

## Tools

### Workflow Operations
| Tool | Description |
|------|-------------|
| `workflow_get` | Get current workflow version (nodes, edges). Call after run_start to see steps. |
| `workflow_set` | Set workflow from JSON. Creates new version. Must be connected DAG. |

### Run Operations
| Tool | Description |
|------|-------------|
| `run_start` | Start new run. Returns run_id, next_step, suggested_collection_kinds. |
| `run_step` | Advance run: start next node or complete current node with output. |
| `run_status` | Get run status: nodes, collections, next_step, current_node_id. |
| `run_complete` | Mark run as completed. Call after event_append run_completed. |

### Collection Operations
| Tool | Description |
|------|-------------|
| `collection_schema_get` | Get collection schema. CALL before writing collections. |
| `collection_schema_set` | Set full collection schema. |
| `collection_schema_add_kind` | Add one collection kind to schema. |
| `collection_list` | List collection kinds with data for a run. |
| `collection_get` | Get all items of a kind for a run. |
| `collection_set` | Replace all items of a kind. |
| `collection_append` | Append one item to a kind. |

### Event Operations
| Tool | Description |
|------|-------------|
| `event_append` | Append event to run log. Use for step_started, step_completed, run_completed. |

### Skills Operations
| Tool | Description |
|------|-------------|
| `skills_list` | List available Agent skills. |
| `skills_get` | Get full SKILL.md content for a skill. |

### Plane Operations
| Tool | Description |
|------|-------------|
| `plane_sync` | Sync local data to Plane. Returns sync results. |
| `plane_status` | Check Plane connection status. Returns storage type and connection details. |
| `plane_list_issues` | List Plane issues for the configured project. Optional labels filter. |
| `plane_get_issue` | Get a Plane issue with its Cognetivy metadata. Parses embedded JSON. |

## Usage

### Starting a Run
```
1. workflow_get → see workflow structure
2. collection_schema_get → check schema
3. collection_schema_add_kind → add missing kinds
4. run_start(name, input_json) → get run_id, next_step
5. run_step(run_id) → start first node
6. Do work for current node
7. run_step(run_id, node_id, collection_kind, collection_items) → complete node
8. Repeat until next_step.action === "complete_run"
9. event_append(run_id, { type: "run_completed" })
10. run_complete(run_id)
```

### Checking Run Status
```
run_status(run_id) → returns nodes[], collections[], next_step, current_node_id
```

### Parallel Node Execution
When `next_step.action === "run_nodes_parallel"`:
- Spawn one sub-agent per `next_step.runnable_node_ids`
- Each sub-agent: `run_step(run_id, node_id)` → work → `run_step(run_id, node_id, collection_kind, ...)`

## Rich Text
Use **Markdown** for long text fields (summaries, theses, descriptions) so Studio renders them as rich text.

## Traceability
Every collection item has optional:
- `citations`: array of `{ url }` or `{ item_ref: "kind:id" }`
- `derived_from`: array of `{ kind, item_id }`
- `reasoning`: explanation of how item was derived

## Storage Types

Cognetivy supports multiple storage backends:

| Type | Description |
|------|-------------|
| `file` | Local filesystem (default). Stores in `.cognetivy/` directory. |
| `plane` | Plane API. Syncs workflow/run data to Plane issues. |
| `hybrid` | Both file and Plane. Writes locally first, syncs async to Plane. |

### Configuring Storage
```bash
# Initialize with Plane storage
cognetivy init --storage plane \
  --plane-url http://your-plane-instance \
  --plane-key YOUR_API_KEY \
  --plane-workspace YOUR_WORKSPACE \
  --plane-project YOUR_PROJECT

# Sync local data to Plane
cognetivy sync

# Test Plane connection
cognetivy test-plane
```

## Examples

### Start a Research Workflow
```json
{
  "tool": "run_start",
  "arguments": {
    "name": "AI trends 2026",
    "input_json": { "topic": "AI agents" }
  }
}
```

### Complete a Node with Output
```json
{
  "tool": "run_step",
  "arguments": {
    "run_id": "run_abc123",
    "node_id": "research",
    "collection_kind": "sources",
    "collection_items": [
      { "url": "https://example.com", "title": "Example" }
    ]
  }
}
```

### Add Collection Kind
```json
{
  "tool": "collection_schema_add_kind",
  "arguments": {
    "kind": "ideas",
    "description": "Ideas extracted from research",
    "required": ["title", "description"]
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PLANE_URL` | Plane instance URL |
| `PLANE_API_KEY` | Plane API key |
| `PLANE_WORKSPACE` | Plane workspace slug |
| `PLANE_PROJECT` | Plane project ID |

## See Also
- `docs/ARCHITECTURE.md` - System architecture
- `docs/SETUP.md` - Setup guide
- `docs/PLANE_EMBED.md` - Embedding in Plane