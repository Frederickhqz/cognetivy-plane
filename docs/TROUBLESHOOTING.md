# Troubleshooting

Common issues and solutions for Cognetivy+Plane integration.

## Installation Issues

### `command not found: cognetivy`

**Problem:** CLI not installed or not in PATH.

**Solution:**
```bash
# Install globally
npm install -g cognetivy

# Or use npx
npx cognetivy init
```

### `Cannot find module 'cognetivy'`

**Problem:** Module not found in Node.js project.

**Solution:**
```bash
# Install as dependency
npm install cognetivy

# Or link local development version
cd cognetivy-plane/cli && npm link
```

## Configuration Issues

### `Plane configuration required`

**Problem:** Storage type is `plane` or `hybrid` but Plane config is missing.

**Solution:**
```bash
# Set environment variables
export PLANE_API_URL="http://your-plane-instance"
export PLANE_API_KEY="plane_api_xxx"
export PLANE_WORKSPACE="your-workspace"
export PLANE_PROJECT="your-project-id"

# Or update config.json
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
```

### `Invalid API key`

**Problem:** Plane API key is invalid or expired.

**Solution:**
1. Go to Plane Settings > API Keys
2. Create a new API key with project access
3. Update `PLANE_API_KEY` environment variable

### `Workspace not found`

**Problem:** Workspace slug is incorrect.

**Solution:**
```bash
# Check available workspaces
curl -H "X-API-Key: $PLANE_API_KEY" \
  "$PLANE_API_URL/api/v1/workspaces/"

# Update PLANE_WORKSPACE with correct slug
```

### `Project not found`

**Problem:** Project ID is incorrect.

**Solution:**
```bash
# Check available projects
curl -H "X-API-Key: $PLANE_API_KEY" \
  "$PLANE_API_URL/api/v1/workspaces/$PLANE_WORKSPACE/projects/"

# Update PLANE_PROJECT with correct ID
```

## Sync Issues

### `Sync returns errors`

**Problem:** Sync operation failed with errors.

**Common Causes:**
1. Network connectivity issues
2. Invalid API key
3. Missing workspace or project
4. Plane API rate limiting

**Solution:**
```bash
# Test connection first
cognetivy test-plane

# Check error details in sync response
# Errors are returned in the "errors" array
```

### `Metadata not preserved`

**Problem:** Cognetivy metadata lost after sync to Plane.

**Cause:** Plane HTML sanitization removes certain elements.

**Solution:**
Metadata is stored in code blocks with `cognetivy` language tag:
````markdown
```cognetivy
{"t":"workflow","i":"wf_default","v":"v1"}
```
````
This format survives Plane's HTML sanitization. If metadata is still lost:
1. Check Plane version supports code blocks
2. Verify no custom sanitization rules
3. Use hybrid storage for backup

### `Duplicate issues created`

**Problem:** Sync creates duplicate Plane issues.

**Cause:** Workflow ID changed or previous sync didn't complete.

**Solution:**
1. Check for existing issues with `cognetivy:workflow` label
2. Delete duplicates in Plane
3. Re-run sync

## MCP Issues

### `Unknown tool: plane_sync`

**Problem:** Tool not found in MCP server.

**Cause:** Working directory is not a Cognetivy workspace.

**Solution:**
```bash
# Ensure you're in a Cognetivy workspace
cd /path/to/workspace

# Initialize if needed
cognetivy init

# Start MCP server
cognetivy mcp
```

### `ENOENT: no such file or directory`

**Problem:** File not found during MCP operation.

**Cause:** Missing directories in workspace.

**Solution:**
```bash
# Create missing directories
mkdir -p .cognetivy/runs .cognetivy/events .cognetivy/workflows/default/collections

# Or reinitialize
cognetivy init
```

### `plane_status returns file_only`

**Problem:** Storage type is `hybrid` but status shows `file_only`.

**Cause:** Plane configuration not recognized.

**Solution:**
```bash
# Check config.json format
cat .cognetivy/config.json

# Should have "plane" object, not top-level planeApiUrl
# Correct:
{
  "storage": "hybrid",
  "plane": {
    "apiUrl": "http://...",
    "apiKey": "plane_api_...",
    "workspace": "...",
    "project": "..."
  }
}

# Incorrect:
{
  "storage": "hybrid",
  "planeApiUrl": "http://...",
  "planeApiKey": "plane_api_...",
  "planeWorkspace": "...",
  "planeProject": "..."
}
```

## Webhook Issues

### `Webhook server fails to start`

**Problem:** `cognetivy webhooks` fails with port error.

**Cause:** Port already in use.

**Solution:**
```bash
# Use different port
cognetivy webhooks --port 3001

# Or find and kill process using port
lsof -i :3000
kill <PID>
```

### `CORS error in browser`

**Problem:** Embed views fail with CORS error.

**Cause:** Cognetivy server not configured for cross-origin requests.

**Solution:**
The webhook server includes CORS headers for common development ports. For production:
1. Update allowed origins in `webhooks.ts`
2. Configure reverse proxy (nginx, etc.) with CORS headers

## Embed Issues

### `iframe shows blank page`

**Problem:** Embed views don't render.

**Causes:**
1. Cognetivy server not running
2. Wrong URL
3. CORS blocking

**Solution:**
```bash
# 1. Start Cognetivy Studio
cd cognetivy-plane/studio && npm run preview

# 2. Check URL
# Should be: http://localhost:4173/embed/runs?projectId=...

# 3. Check browser console for CORS errors
# Add origin to allowedOrigins in webhooks.ts
```

### `Height not adjusting`

**Problem:** iframe height doesn't adjust to content.

**Cause:** iframe-resizer not initialized.

**Solution:**
```html
<!-- Add iframe-resizer script -->
<script src="https://cdn.jsdelivr.net/npm/iframe-resizer@4.3.2/js/iframeResizer.min.js"></script>
<script>
  iframeResize({ log: false }, '#cognetivy-iframe');
</script>
```

## Performance Issues

### `Sync is slow`

**Problem:** Sync takes a long time for large datasets.

**Solutions:**
1. Use `--workflow` flag to sync specific workflow
2. Run sync during off-peak hours
3. Use file storage for development, hybrid for production

### `MCP server uses too much memory`

**Problem:** MCP server memory usage grows over time.

**Cause:** Large collections or run history.

**Solutions:**
1. Archive old runs
2. Limit collection size
3. Restart MCP server periodically

## Getting Help

1. **Check documentation**: [docs/](docs/)
2. **Search issues**: [GitHub Issues](https://github.com/Frederickhqz/cognetivy-plane/issues)
3. **Open new issue**: Include error message, config (without API key), and steps to reproduce

## Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
export COGNETIVY_DEBUG=1

# Run command
cognetivy mcp
```

This will output additional logging to stderr for troubleshooting.