# CLI Reference

Complete reference for all Cognetivy CLI commands.

## Installation

```bash
# Install globally
npm install -g cognetivy

# Or use npx
npx cognetivy init
```

## Commands

### `cognetivy init`

Initialize a new Cognetivy workspace.

```bash
# File-based storage (default)
cognetivy init

# Plane storage (requires --plane-* options)
cognetivy init --storage plane \
  --plane-url http://your-plane-instance \
  --plane-key $PLANE_API_KEY \
  --plane-workspace your-workspace \
  --plane-project your-project-id

# Hybrid storage (recommended)
cognetivy init --storage hybrid \
  --plane-url http://your-plane-instance \
  --plane-key $PLANE_API_KEY \
  --plane-workspace your-workspace \
  --plane-project your-project-id
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--storage <type>` | Storage type: `file`, `plane`, or `hybrid` | `file` |
| `--plane-url <url>` | Plane instance URL | - |
| `--plane-key <key>` | Plane API key | - |
| `--plane-workspace <slug>` | Plane workspace slug | - |
| `--plane-project <id>` | Plane project ID | - |

**Output:**

Creates `.cognetivy/` directory with:
- `workflows/` - Workflow definitions
- `runs/` - Run data
- `events/` - Event logs
- `collections/` - Collection data
- `config.json` - Configuration

### `cognetivy sync`

Sync local data to Plane.

```bash
# Sync all workflows and runs
cognetivy sync

# Sync specific workflow
cognetivy sync --workflow wf_default
```

**Output:**

```json
{
  "workflows_synced": 1,
  "runs_synced": 5,
  "collections_synced": 10,
  "errors": []
}
```

**Requirements:**

- Storage type must be `plane` or `hybrid`
- Plane configuration must be set

### `cognetivy migrate`

Migrate existing Cognetivy workspace to Plane storage.

```bash
# Migrate to hybrid storage (recommended)
cognetivy migrate \
  --plane-url http://your-plane-instance \
  --plane-key $PLANE_API_KEY \
  --plane-workspace your-workspace \
  --plane-project your-project-id

# Migrate to Plane-only storage
cognetivy migrate --storage plane \
  --plane-url http://your-plane-instance \
  --plane-key $PLANE_API_KEY \
  --plane-workspace your-workspace \
  --plane-project your-project-id

# Dry-run (preview migration)
cognetivy migrate --dry-run \
  --plane-url http://your-plane-instance \
  --plane-key $PLANE_API_KEY \
  --plane-workspace your-workspace \
  --plane-project your-project-id
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--storage <type>` | Storage type: `hybrid` or `plane` | `hybrid` |
| `--plane-url <url>` | Plane instance URL | - |
| `--plane-key <key>` | Plane API key | - |
| `--plane-workspace <slug>` | Plane workspace slug | - |
| `--plane-project <id>` | Plane project ID | - |
| `--dry-run` | Preview migration without changes | - |
| `--verbose` | Show detailed progress | - |

**Output:**

```
Cognetivy Migration Tool
=========================
Source: /path/to/workspace
Target storage: hybrid

Found 1 workflow(s), 5 run(s) to migrate.

Updated config: /path/to/workspace/.cognetivy/config.json

Syncing to Plane...
Migrated 1 workflow(s), 5 run(s), 10 collection(s)

Migration complete!
Storage type: hybrid
Plane URL: http://your-plane-instance
Workspace: your-workspace
Project: your-project-id
```

### `cognetivy test-plane`

Test Plane connection and configuration.

```bash
cognetivy test-plane
```

**Output:**

```
✅ Connection successful!
URL: http://your-plane-instance
Workspace: your-workspace
Project: your-project-id
```

**Errors:**

- `❌ Connection failed: Invalid API key`
- `❌ Connection failed: Workspace not found`
- `❌ Connection failed: Project not found`

### `cognetivy mcp`

Start the MCP (Model Context Protocol) server.

```bash
# Start server (stdio mode)
cognetivy mcp

# Used by AI agents via stdin/stdout
# Example: echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | cognetivy mcp
```

**MCP Methods:**

| Method | Description |
|--------|-------------|
| `initialize` | Initialize server, get capabilities |
| `tools/list` | List available tools |
| `tools/call` | Call a tool |

**Example:**

```bash
# List tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | cognetivy mcp

# Call plane_status
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"plane_status","arguments":{}}}' | cognetivy mcp
```

### `cognetivy webhooks`

Start the webhook server for Plane events.

```bash
# Start on default port (3000)
cognetivy webhooks

# Custom port
cognetivy webhooks --port 8080
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--port <port>` | Port to listen on | `3000` |

**Endpoints:**

- `POST /webhooks/plane` - Receive Plane webhooks
- `GET /health` - Health check

## Storage Types

### File Storage

- **Location**: `.cognetivy/` directory
- **Sync**: No sync, local only
- **Best for**: Development, offline use

### Plane Storage

- **Location**: Plane API
- **Sync**: Automatic on all operations
- **Best for**: Team collaboration, cloud-only

### Hybrid Storage

- **Location**: Local `.cognetivy/` + Plane API
- **Sync**: Local write first, then async to Plane
- **Best for**: Production, best reliability

## Configuration

### Environment Variables

```bash
export PLANE_API_URL="http://your-plane-instance"
export PLANE_API_KEY="plane_api_xxx"
export PLANE_WORKSPACE="your-workspace"
export PLANE_PROJECT="your-project-id"
```

### Config File (`.cognetivy/config.json`)

```json
{
  "storage": "hybrid",
  "plane": {
    "apiUrl": "http://your-plane-instance",
    "apiKey": "plane_api_xxx",
    "workspace": "your-workspace",
    "project": "your-project-id"
  },
  "skills": {
    "sources": ["workspace", "agent"],
    "extraDirs": ["/path/to/skills"]
  }
}
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Error (see stderr) |
| 2 | Configuration error |
| 3 | Connection error |

## Examples

### Initialize and run workflow

```bash
# 1. Initialize
cognetivy init --storage hybrid \
  --plane-url http://localhost:54617 \
  --plane-key $PLANE_API_KEY \
  --plane-workspace agents \
  --plane-project PLANE

# 2. Test connection
cognetivy test-plane

# 3. Start MCP server
cognetivy mcp
```

### Sync existing data

```bash
# 1. Test connection first
cognetivy test-plane

# 2. Sync all data
cognetivy sync

# 3. Verify in Plane
# Open http://localhost:54617 and check for cognetivy:workflow issues
```

### Receive webhooks

```bash
# 1. Start webhook server
cognetivy webhooks --port 3000

# 2. Configure Plane to send webhooks to:
# http://your-server:3000/webhooks/plane

# 3. Webhooks will update local .cognetivy/ on Plane changes
```