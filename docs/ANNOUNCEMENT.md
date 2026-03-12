# Announcing Cognetivy + Plane Integration

**A seamless workflow orchestration engine with deep Plane project management integration.**

We're excited to announce the release of Cognetivy with native Plane integration! This brings AI-powered workflow orchestration directly into your Plane project management workflow.

## What is Cognetivy?

Cognetivy is a workflow execution engine designed for AI agents. It enables step-by-step execution of complex workflows with:

- **Workflow DAGs**: Define workflows as directed acyclic graphs
- **Collection-based data flow**: Pass data between nodes via typed collections
- **MCP Integration**: Native Model Context Protocol support for AI agents
- **Run tracking**: Complete execution history with events and collections

## What's New: Plane Integration

This release adds deep integration with [Plane](https://plane.so), the open-source project management tool:

### 1. Bidirectional Sync

Workflows and runs sync to Plane issues automatically:
- Workflows become parent issues with `cognetivy:workflow` label
- Runs become sub-issues with `cognetivy:run` label
- Collection data is preserved in issue descriptions

### 2. Embeddable Views

Embed Cognetivy directly in Plane:
- **Runs View**: `/embed/runs?projectId=...` - Show workflow runs in project sidebar
- **Workflow Editor**: `/embed/workflow/:id` - Edit workflows in issue views

### 3. MCP Tools for AI Agents

New MCP tools for Plane operations:
- `plane_sync` - Sync local data to Plane
- `plane_status` - Check connection status
- `plane_list_issues` - List Plane issues
- `plane_get_issue` - Get issue with Cognetivy metadata

### 4. Webhook Support

Receive real-time updates from Plane:
- Start webhook server: `cognetivy webhook --port 3000`
- Configure Plane to send webhooks to `http://your-server:3000/webhooks/plane`
- Local data updates automatically when Plane changes

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/Frederickhqz/cognetivy-plane.git
cd cognetivy-plane/cli
npm install
npm run build
```

### Initialize with Plane

```bash
# Set environment variables
export PLANE_API_URL="http://your-plane-instance"
export PLANE_API_KEY="plane_api_xxx"
export PLANE_WORKSPACE="your-workspace"
export PLANE_PROJECT="your-project-id"

# Initialize with hybrid storage
node dist/cli.js init --storage hybrid \
  --plane-url $PLANE_API_URL \
  --plane-key $PLANE_API_KEY \
  --plane-workspace $PLANE_WORKSPACE \
  --plane-project $PLANE_PROJECT
```

### Use with AI Agents

```bash
# Start MCP server
node dist/cli.js mcp

# Agents can now use workflow_get, run_start, plane_sync, etc.
```

### Embed in Plane

Add to your Plane custom view:

```html
<iframe
  src="http://your-cognetivy-host/embed/runs?projectId=${project.id}"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

## Architecture

```
┌─────────────┐      MCP       ┌─────────────┐
│  AI Agent   │◄──────────────►│  Cognetivy  │
│ (Cursor/    │                 │    CLI      │
│  OpenClaw)  │                 └──────┬──────┘
└─────────────┘                        │
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                    ┌─────▼─────┐           ┌───────▼───────┐
                    │   Local   │           │     Plane     │
                    │  Storage  │◄─────────►│      API      │
                    └───────────┘   sync    └───────────────┘
```

## Documentation

- [README.md](README.md) - Quick start guide
- [docs/MIGRATION.md](docs/MIGRATION.md) - Migrate from file storage
- [docs/CLI_REFERENCE.md](docs/CLI_REFERENCE.md) - All CLI commands
- [docs/API_REFERENCE.md](docs/API_REFERENCE.md) - MCP tools API
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Common issues

## What's Next

- **More embed views**: Timeline, statistics, real-time run monitoring
- **Webhook automation**: Trigger workflows from Plane events
- **Custom node types**: Domain-specific workflow nodes
- **Team collaboration**: Shared workflow templates

## Credits

- Original Cognetivy by [Meitar](https://github.com/meitarbe/cognetivy)
- Plane integration by [Frederick Henriquez](https://github.com/Frederickhqz)

## Links

- **GitHub**: https://github.com/Frederickhqz/cognetivy-plane
- **Plane**: https://plane.so
- **MCP Protocol**: https://modelcontextprotocol.io

---

*This release represents 4 phases of development:*

1. **Phase 1**: Fork + Plane API Adapter
2. **Phase 2**: Storage Adapter + Webhooks
3. **Phase 3**: Deep UI Integration (embeds, theme)
4. **Phase 4**: Agent Integration (MCP tools)
5. **Phase 5**: Migration + Documentation

*All 17 commits are available on GitHub.*