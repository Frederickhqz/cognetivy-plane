# Cognetivy + Plane Integration

**A workflow execution engine with deep Plane integration.**

Cognetivy is a workflow orchestration engine that executes multi-step agent workflows. With Plane integration, you can sync workflows and runs to Plane issues for project management.

## Quick Start

### 1. Initialize Workspace

```bash
# File-based storage (default)
cognetivy init

# Hybrid storage (syncs to Plane)
cognetivy init --storage hybrid \
  --plane-url http://your-plane-instance \
  --plane-key $PLANE_API_KEY \
  --plane-workspace your-workspace \
  --plane-project your-project-id
```

### 2. Start MCP Server

```bash
cognetivy mcp
```

### 3. Use with AI Agents

Connect to the MCP server from your AI agent (Cursor, OpenClaw, etc.) and use the workflow tools:

- `workflow_get` - Get current workflow
- `run_start` - Start a workflow run
- `run_step` - Execute workflow steps
- `run_status` - Check run progress

## Storage Types

| Type | Description | Use Case |
|------|-------------|----------|
| `file` | Local filesystem only | Development, offline |
| `plane` | Plane API only | Team collaboration |
| `hybrid` | Local + Plane sync | Production, best of both |

## Plane Integration

### Features

- **Bidirectional Sync**: Local changes sync to Plane, Plane changes sync back
- **Issue Mapping**: Workflows → Plane issues, Runs → Plane sub-issues
- **Metadata Preservation**: Cognetivy data stored in issue description
- **Webhook Support**: Real-time updates from Plane webhooks

### Setup

1. **Get Plane API Key**
   - Go to Settings > API Keys in Plane
   - Create a new API key with project access

2. **Set Environment Variables**
   ```bash
   export PLANE_API_URL="http://your-plane-instance"
   export PLANE_API_KEY="plane_api_xxx"
   export PLANE_WORKSPACE="your-workspace"
   export PLANE_PROJECT="your-project-id"
   ```

3. **Initialize with Hybrid Storage**
   ```bash
   cognetivy init --storage hybrid
   ```

4. **Test Connection**
   ```bash
   cognetivy test-plane
   ```

5. **Sync Existing Data**
   ```bash
   cognetivy sync
   ```

### Embedding in Plane

Embed Cognetivy views in Plane using iframes:

```html
<!-- Runs View -->
<iframe
  src="http://your-cognetivy-host/embed/runs?projectId=YOUR_PROJECT"
  width="100%"
  height="600"
  frameborder="0"
></iframe>

<!-- Workflow Editor -->
<iframe
  src="http://your-cognetivy-host/embed/workflow/wf_default"
  width="100%"
  height="800"
  frameborder="0"
></iframe>
```

See [docs/PLANE_EMBED.md](docs/PLANE_EMBED.md) for full embedding guide.

## MCP Tools

### Workflow Operations

| Tool | Description |
|------|-------------|
| `workflow_get` | Get current workflow version (nodes, edges) |
| `workflow_set` | Set workflow from JSON |

### Run Operations

| Tool | Description |
|------|-------------|
| `run_start` | Start new run. Returns run_id, next_step |
| `run_step` | Advance run: start or complete node |
| `run_status` | Get run status: nodes, collections, next_step |
| `run_complete` | Mark run as completed |

### Collection Operations

| Tool | Description |
|------|-------------|
| `collection_schema_get` | Get collection schema |
| `collection_schema_set` | Set full collection schema |
| `collection_schema_add_kind` | Add one collection kind |
| `collection_list` | List collection kinds with data |
| `collection_get` | Get all items of a kind |
| `collection_set` | Replace all items of a kind |
| `collection_append` | Append one item to a kind |

### Plane Operations

| Tool | Description |
|------|-------------|
| `plane_sync` | Sync local data to Plane |
| `plane_status` | Check Plane connection status |
| `plane_list_issues` | List Plane issues with optional filter |
| `plane_get_issue` | Get Plane issue with Cognetivy metadata |

### Skills Operations

| Tool | Description |
|------|-------------|
| `skills_list` | List available Agent skills |
| `skills_get` | Get full SKILL.md content |

## CLI Reference

| Command | Description |
|---------|-------------|
| `cognetivy init` | Initialize workspace (file storage) |
| `cognetivy init --storage plane` | Initialize with Plane storage |
| `cognetivy init --storage hybrid` | Initialize with hybrid storage |
| `cognetivy sync` | Sync local data to Plane |
| `cognetivy test-plane` | Test Plane connection |
| `cognetivy mcp` | Start MCP server (stdio) |

## Architecture

```
┌─────────────────┐     MCP      ┌─────────────────┐
│   AI Agent      │◄────────────►│  Cognetivy CLI  │
│  (Cursor/OpenClaw)              │   (MCP Server)   │
└─────────────────┘              └────────┬────────┘
                                          │
                                    ┌─────┴─────┐
                                    │           │
                              ┌─────▼─────┐ ┌───▼────┐
                              │   File    │ │ Plane  │
                              │  Storage  │ │  API   │
                              └───────────┘ └────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architecture.

## Documentation

| Document | Description |
|----------|-------------|
| [SKILL.md](SKILL.md) | Agent skill definition |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [docs/SETUP.md](docs/SETUP.md) | Setup guide |
| [docs/API.md](docs/API.md) | Plane API requirements |
| [docs/PLANE_EMBED.md](docs/PLANE_EMBED.md) | Embedding guide |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Migration from file to Plane |
| [docs/CLI_REFERENCE.md](docs/CLI_REFERENCE.md) | CLI command reference |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues |

## Examples

| Example | Description |
|---------|-------------|
| [examples/embed-runs.html](examples/embed-runs.html) | Simple runs embed |
| [examples/embed-workflow.html](examples/embed-workflow.html) | Simple workflow embed |
| [examples/embed-test.html](examples/embed-test.html) | Comprehensive test page |

## Development

```bash
# Clone and install
git clone https://github.com/Frederickhqz/cognetivy-plane.git
cd cognetivy-plane
npm install

# Build CLI
cd cli && npm run build

# Build Studio
cd studio && npm run build

# Run tests
npm test
```

## License

MIT

## Credits

- Original Cognetivy by [Meitar](https://github.com/meitarbe/cognetivy)
- Plane integration by [Frederick Henriquez](https://github.com/Frederickhqz)