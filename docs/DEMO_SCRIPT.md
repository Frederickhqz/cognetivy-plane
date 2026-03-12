# Cognetivy + Plane Integration Demo Script

**Recording time: ~5 minutes**

## Setup

1. Start Cognetivy Studio: `cd cognetivy-plane/studio && npm run preview`
2. Start Plane: Ensure running at `http://168.231.69.92:54617`
3. Start MCP server: `cd cli && node dist/cli.js mcp` (in another terminal)
4. Open browser to Studio: `http://localhost:4173`

## Part 1: MCP Tools Demo (90 seconds)

### Show workflow_get

```bash
# In terminal, show MCP tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/cli.js mcp | jq '.result.tools[].name'
```

**Narration:** "Cognetivy provides 20+ MCP tools for workflow management. Let me show you the core ones..."

```bash
# Get current workflow
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"workflow_get","arguments":{}}}' | node dist/cli.js mcp | jq '.result.content[0].text' -r | jq '.workflow'
```

**Narration:** "workflow_get returns the current workflow with nodes and edges. Each node represents a step in the agent execution."

### Show run_start and run_step

```bash
# Start a run
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"run_start","arguments":{"name":"Demo Run","input_json":{"topic":"AI agents"}}}}' | node dist/cli.js mcp | jq '.result.content[0].text' -r | jq '.run_id, .next_step'
```

**Narration:** "Starting a run returns a run_id and the next step. The agent can then execute steps using run_step."

## Part 2: Plane Integration Demo (90 seconds)

### Show plane_status

```bash
# Check Plane connection
cd /tmp/cognetivy-test
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"plane_status","arguments":{}}}' | node /data/.openclaw/workspace/cognetivy-plane/cli/dist/cli.js mcp | jq '.result.content[0].text' -r | jq
```

**Narration:** "plane_status shows the Plane connection. With hybrid storage, it returns 'connected' and the workspace details."

### Show plane_list_issues

```bash
# List Plane issues
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"plane_list_issues","arguments":{}}}' | node /data/.openclaw/workspace/cognetivy-plane/cli/dist/cli.js mcp | jq '.result.content[0].text' -r | jq '.count, .issues[0]'
```

**Narration:** "plane_list_issues retrieves all issues from the configured Plane project. You can filter by labels."

## Part 3: Embed Views Demo (60 seconds)

### Open embed test page

```bash
# Open embed test page in browser
open examples/embed-test.html
# Or: xdg-open examples/embed-test.html
```

**Narration:** "Cognetivy provides embeddable views for Plane integration. This test page shows both the runs view and workflow editor."

### Show runs embed

**In browser:**
1. Show runs table loading
2. Point out the status badges (completed, running, failed)
3. Click on a run to show postMessage communication

**Narration:** "The runs embed shows workflow runs in a table. Clicking a run sends a postMessage to the parent, useful for navigation in Plane."

### Show workflow editor embed

**In browser:**
1. Show workflow nodes
2. Click on a node to show selection
3. Point out the connector lines between nodes

**Narration:** "The workflow editor shows the workflow DAG. Nodes represent execution steps, and edges show data flow."

## Part 4: CLI Demo (60 seconds)

### Show init command

```bash
# Initialize new workspace
cd /tmp/demo-workspace
node /data/.openclaw/workspace/cognetivy-plane/cli/dist/cli.js init
ls -la .cognetivy/
```

**Narration:** "The init command creates a .cognetivy directory with the workflow structure."

### Show migrate command

```bash
# Show migrate help
node /data/.openclaw/workspace/cognetivy-plane/cli/dist/cli.js migrate --help
```

**Narration:** "The migrate command converts existing workspaces to Plane storage. Use --dry-run to preview changes."

## Part 5: Documentation (30 seconds)

### Show docs

```bash
ls -la docs/
# Show README
head -50 README.md
```

**Narration:** "Complete documentation includes migration guide, CLI reference, troubleshooting, and API reference."

## Wrap-up

**Narration:** "Cognitivy+Plane integration provides:
- Full MCP tool integration for AI agents
- Bidirectional sync with Plane issues
- Embeddable views for Plane UI
- Complete CLI for migration and management

All code is open source at github.com/Frederickhqz/cognetivy-plane"

---

## Demo Checklist

- [ ] Studio running at localhost:4173
- [ ] Plane accessible at 168.231.69.92:54617
- [ ] MCP server tested with plane_status
- [ ] Embed test page opens in browser
- [ ] CLI commands work (init, migrate --help)
- [ ] Documentation accessible