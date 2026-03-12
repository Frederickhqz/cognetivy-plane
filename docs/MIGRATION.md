# Migration Guide

This guide helps existing Cognetivy users migrate to the Plane-integrated version.

## Overview

Cognetivy+Plane adds:
- **Plane Storage Adapter**: Sync workflows and runs to Plane issues
- **Webhook Server**: Receive real-time updates from Plane
- **Embed Views**: Embed Cognetivy in Plane custom views
- **MCP Tools**: New `plane_sync`, `plane_status`, `plane_list_issues`, `plane_get_issue`

## Migration Paths

### 1. File to Hybrid (Recommended)

Keeps local file storage and adds Plane sync:

```bash
# 1. Backup existing data
cp -r .cognetivy .cognetivy.backup

# 2. Set environment variables
export PLANE_API_URL="http://your-plane-instance"
export PLANE_API_KEY="plane_api_xxx"
export PLANE_WORKSPACE="your-workspace"
export PLANE_PROJECT="your-project-id"

# 3. Update config.json
cat > .cognetivy/config.json << 'EOF'
{
  "storage": "hybrid",
  "plane": {
    "apiUrl": "http://your-plane-instance",
    "apiKey": "plane_api_xxx",
    "workspace": "your-workspace",
    "project": "your-project-id"
  }
}
EOF

# 4. Sync existing data to Plane
cognetivy sync

# 5. Verify connection
cognetivy test-plane
```

### 2. File to Plane (Cloud-Only)

Removes local file storage, uses Plane as sole source of truth:

```bash
# 1. Backup existing data
cp -r .cognetivy .cognetivy.backup

# 2. Reinitialize with Plane storage
cognetivy init --storage plane \
  --plane-url http://your-plane-instance \
  --plane-key $PLANE_API_KEY \
  --plane-workspace your-workspace \
  --plane-project your-project-id

# Note: Existing local data will not be migrated automatically.
# Use hybrid mode first, then switch to Plane-only if desired.
```

### 3. New Installation (Hybrid)

For new projects:

```bash
# Initialize with hybrid storage
cognetivy init --storage hybrid \
  --plane-url http://your-plane-instance \
  --plane-key $PLANE_API_KEY \
  --plane-workspace your-workspace \
  --plane-project your-project-id
```

## Data Mapping

Cognetivy data maps to Plane issues as follows:

| Cognetivy | Plane |
|-----------|-------|
| Workflow | Issue with `cognetivy:workflow` label |
| Run | Issue with `cognetivy:run` label, parent = workflow issue |
| Collection | Issue comment with `data-kind` attribute |
| Node Result | Issue comment with `data-node-id` attribute |
| Event | Issue comment with `data-event-type` attribute |

## Metadata Format

Cognetivy metadata is stored in Plane issue descriptions using code blocks:

````markdown
# Workflow Name

Workflow description...

```cognetivy
{"t":"workflow","i":"wf_default","v":"v1"}
```
````

This format survives Plane's HTML sanitization and can be parsed back.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PLANE_API_URL` | Plane instance URL | Yes |
| `PLANE_API_KEY` | Plane API key | Yes |
| `PLANE_WORKSPACE` | Workspace slug | Yes |
| `PLANE_PROJECT` | Project ID or identifier | Yes |

## Troubleshooting

### "Plane configuration required"

Make sure environment variables are set or `config.json` contains Plane settings.

### "Connection failed"

Run `cognetivy test-plane` to check connection details.

### "Metadata not preserved"

Metadata is stored in code blocks with `cognetivy` language tag. Ensure Plane doesn't strip these.

### "Sync returns errors"

Check the errors array in the sync response. Common issues:
- Invalid API key
- Missing workspace or project
- Network connectivity issues

## Rollback

To rollback to file-only storage:

```bash
# 1. Restore backup
rm -rf .cognetivy
mv .cognetivy.backup .cognetivy

# 2. Update config
cat > .cognetivy/config.json << 'EOF'
{
  "storage": "file"
}
EOF

# 3. Restart MCP server
cognetivy mcp
```

## Next Steps

After migration:

1. **Test the sync**: Run `cognetivy sync` and verify in Plane
2. **Set up webhooks**: Configure Plane to send webhook events to Cognetivy
3. **Embed views**: Add Cognetivy embeds to Plane custom views
4. **Update agents**: Point AI agents to the new MCP server

See [docs/PLANE_EMBED.md](PLANE_EMBED.md) for embedding instructions.