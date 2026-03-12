# Cognetivy + Plane Integration - Setup Guide

## Quick Start

### 1. File Storage (Default)

No configuration needed. Cognetivy stores data in `.cognetivy/` directory.

```bash
npx cognetivy init
npx cognetivy run start --input input.json
```

### 2. Plane Storage (Cloud)

Set environment variables:

```bash
export PLANE_API_URL="http://your-plane-instance:8000"
export PLANE_API_KEY="plane_api_your_key"
export PLANE_WORKSPACE="your-workspace"
export PLANE_PROJECT="your-project-id"
```

Create `.cognetivy/config.json`:

```json
{
  "storage": "plane"
}
```

### 3. Hybrid Storage (Local + Sync)

Best of both worlds: local files with automatic Plane sync.

```json
{
  "storage": "hybrid",
  "primaryAdapter": "file",
  "syncOnWrite": true,
  "plane": {
    "apiUrl": "http://your-plane-instance:8000",
    "apiKey": "plane_api_your_key",
    "workspace": "your-workspace",
    "project": "your-project-id"
  }
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PLANE_API_URL` | Plane instance URL | `http://localhost:8000` |
| `PLANE_API_KEY` | API key for authentication | `plane_api_xxx` |
| `PLANE_WORKSPACE` | Workspace slug | `agents` |
| `PLANE_PROJECT` | Project ID | `PLANE` or UUID |

## CLI Flags

```bash
# Initialize with hybrid storage
npx cognetivy init --storage hybrid \
  --plane-url http://localhost:8000 \
  --plane-key $PLANE_API_KEY \
  --plane-workspace agents \
  --plane-project PLANE

# Manual sync to Plane
npx cognetivy sync
```

## Storage Types

### `file`
- **Pros**: Fast, offline support, local control
- **Cons**: No sync, manual backup needed
- **Best for**: Development, offline work

### `plane`
- **Pros**: Cloud sync, team visibility, web UI
- **Cons**: Requires network, API rate limits
- **Best for**: Teams, cloud workflows

### `hybrid`
- **Pros**: Local speed + cloud backup
- **Cons**: Sync delays possible
- **Best for**: Most users

## Data Model

Cognetivy data is mapped to Plane issues:

| Cognetivy | Plane | Type |
|-----------|-------|------|
| Workflow | Issue | `workflow` label |
| Run | Issue | `workflow_run` label, parent: workflow |
| Collection | Comment | JSON in `<pre><code>` |
| Event | Comment | Event log format |
| Node Result | Comment | Result JSON |

## Example Workflow

```bash
# 1. Create workflow
npx cognetivy workflow create --name "Research"

# 2. Start run (syncs to Plane automatically)
npx cognetivy run start --input '{"topic":"AI trends"}'

# 3. Check run status
npx cognetivy run status --run run_xxx

# 4. Complete nodes
npx cognetivy node complete --run run_xxx --node retrieve_sources

# 5. View in Plane
# Open: http://your-plane-instance/workspaces/agents/projects/PLANE/issues/run_xxx
```