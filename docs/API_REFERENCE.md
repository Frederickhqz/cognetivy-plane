# API Reference

Complete reference for Cognetivy MCP tools API.

## Base Protocol

All requests use JSON-RPC 2.0 over stdio.

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "arg1": "value1"
    }
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"key\": \"value\"}"
      }
    ]
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Error description"
  }
}
```

## Initialize

Initialize the MCP server.

### Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {}
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "cognetivy",
      "version": "0.1.0"
    },
    "instructions": "When you start a run with run_start..."
  }
}
```

## Workflow Tools

### workflow_get

Get the current workflow version.

**Arguments:** None

**Response:**
```json
{
  "workflow": {
    "workflow_id": "wf_default",
    "name": "Default Workflow",
    "current_version_id": "v1"
  },
  "version": {
    "nodes": [...],
    "edges": [...]
  },
  "suggested_collection_kinds": ["run_input", "sources"],
  "_hint": "Before collection_set/collection_append: call collection_schema_get..."
}
```

### workflow_set

Set workflow from JSON.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `workflow_json` | object | Yes | Workflow object |

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "workflow_set",
    "arguments": {
      "workflow_json": {
        "nodes": [
          {"id": "start", "type": "start", "output_collections": ["run_input"]},
          {"id": "research", "type": "task", "input_collections": ["run_input"], "output_collections": ["sources"]}
        ],
        "edges": [
          {"source": "start", "target": "research"}
        ]
      }
    }
  }
}
```

## Run Tools

### run_start

Start a new workflow run.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Run name |
| `input_json` | object | Yes | Input data |
| `workflow_id` | string | No | Workflow ID (default: current) |

**Response:**
```json
{
  "run_id": "run_2026-03-12T21-11-58-125Z_04471n",
  "suggested_collection_kinds": ["run_input", "sources"],
  "next_step": {
    "action": "run_nodes_parallel",
    "runnable_node_ids": ["start", "research"],
    "hint": "Multiple nodes runnable..."
  }
}
```

### run_step

Advance a run by starting or completing a node.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `run_id` | string | Yes | Run ID |
| `node_id` | string | No | Node ID (required to complete) |
| `collection_kind` | string | No | Collection kind for output |
| `collection_items` | array | No | Collection items |
| `collection_payload` | object | No | Collection payload (alternative to items) |

**Examples:**

Start a node:
```json
{
  "name": "run_step",
  "arguments": {
    "run_id": "run_xxx"
  }
}
```

Complete a node with output:
```json
{
  "name": "run_step",
  "arguments": {
    "run_id": "run_xxx",
    "node_id": "research",
    "collection_kind": "sources",
    "collection_items": [
      {"url": "https://example.com", "title": "Example"}
    ]
  }
}
```

### run_status

Get current run status.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `run_id` | string | Yes | Run ID |

**Response:**
```json
{
  "run": {...},
  "nodes": [...],
  "collections": {...},
  "next_step": {...},
  "current_node_id": "research"
}
```

### run_complete

Mark a run as completed.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `run_id` | string | Yes | Run ID |

## Collection Tools

### collection_schema_get

Get collection schema for a workflow.

**Arguments:** None (uses current workflow)

**Response:**
```json
{
  "workflow_id": "wf_default",
  "kinds": {
    "run_input": {
      "description": "Run input",
      "item_schema": {...}
    }
  }
}
```

### collection_schema_add_kind

Add a collection kind to the schema.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `kind` | string | Yes | Collection kind name |
| `description` | string | No | Description |
| `required` | array | No | Required field names |
| `properties` | object | No | JSON Schema properties |

### collection_get

Get all items of a kind for a run.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `run_id` | string | Yes | Run ID |
| `kind` | string | Yes | Collection kind |

### collection_set

Replace all items of a kind.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `run_id` | string | Yes | Run ID |
| `kind` | string | Yes | Collection kind |
| `items` | array | Yes | Array of items |

### collection_append

Append one item to a kind.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `run_id` | string | Yes | Run ID |
| `kind` | string | Yes | Collection kind |
| `item` | object | Yes | Item to append |

## Plane Tools

### plane_sync

Sync local data to Plane.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `workflow_id` | string | No | Specific workflow to sync |

**Response:**
```json
{
  "success": true,
  "workflows_synced": 1,
  "runs_synced": 5,
  "collections_synced": 10,
  "errors": []
}
```

### plane_status

Check Plane connection status.

**Arguments:** None

**Response:**
```json
{
  "status": "connected",
  "storage_type": "hybrid",
  "plane_url": "http://168.231.69.92:54617",
  "plane_workspace": "agents",
  "plane_project": "acf7aa9b-..."
}
```

### plane_list_issues

List Plane issues for the configured project.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `labels` | array | No | Filter by labels |

**Response:**
```json
{
  "count": 19,
  "issues": [
    {"id": "...", "name": "Issue Name", "labels": []}
  ]
}
```

### plane_get_issue

Get a Plane issue with Cognetivy metadata.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `issue_id` | string | Yes | Plane issue ID |

**Response:**
```json
{
  "id": "d8d84521-...",
  "name": "Issue Name",
  "labels": [],
  "cognetivy": {"t": "workflow", "i": "wf_default"}
}
```

## Event Tools

### event_append

Append an event to the run log.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `run_id` | string | Yes | Run ID |
| `event` | object | Yes | Event object |

**Event Types:**
- `step_started` - Node execution started
- `step_completed` - Node execution completed
- `run_completed` - Run finished

## Skills Tools

### skills_list

List available Agent skills.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sources` | array | No | Filter by source |

**Response:**
```json
{
  "skills": [
    {"name": "cognetivy", "path": "/path/to/SKILL.md", "source": "workspace"}
  ]
}
```

### skills_get

Get full SKILL.md content.

**Arguments:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Skill name |
| `source` | string | No | Skill source |