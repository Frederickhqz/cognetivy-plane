# Plane API Requirements for Cognetivy Integration

## API Endpoints Used

### Issues API

```
GET  /api/v1/workspaces/{workspace}/projects/{project}/issues/
GET  /api/v1/workspaces/{workspace}/projects/{project}/issues/{id}/
POST /api/v1/workspaces/{workspace}/projects/{project}/issues/
PATCH /api/v1/workspaces/{workspace}/projects/{project}/issues/{id}/
```

### Comments API

```
GET  /api/v1/workspaces/{workspace}/projects/{project}/issues/{id}/comments/
POST /api/v1/workspaces/{workspace}/projects/{project}/issues/{id}/comments/
```

## Authentication

All requests require `X-API-Key` header:

```http
X-API-Key: plane_api_xxx
Content-Type: application/json
```

## Required Features

### 1. Issue Labels (for Cognetivy entity types)

The adapter uses labels to identify Cognetivy entities:

- `cognetivy:workflow` - Workflow issues
- `cognetivy:run` - Run issues
- `cognetivy:collection` - Collection comments
- `cognetivy:event` - Event comments

### 2. Issue Parent/Child Relationships

Runs are child issues of workflows:
- `parent` field on run issue → workflow issue ID
- Enables filtering runs by workflow

### 3. Extra Props (for extended data)

Issues support `extra_props` for storing additional metadata:

```json
{
  "extra_props": {
    "current_version_id": "v1",
    "workflow_version_id": "v1",
    "final_answer": "The answer...",
    "cognetivy_type": "workflow"
  }
}
```

### 4. Issue States

Run status maps to Plane states:

| Cognetivy Status | Plane State |
|------------------|-------------|
| running          | in_progress |
| completed        | done        |
| failed           | cancelled   |

## API Response Format

### Issue Response

```json
{
  "id": "uuid",
  "name": "Issue name",
  "description_html": "<div>...</div>",
  "state": "state-uuid",
  "parent": "parent-issue-id or null",
  "labels": ["label-ids"],
  "extra_props": {},
  "created_at": "2026-03-12T00:00:00Z",
  "updated_at": "2026-03-12T00:00:00Z"
}
```

### Comment Response

```json
{
  "id": "uuid",
  "issue": "issue-id",
  "comment_html": "<div>...</div>",
  "created_at": "2026-03-12T00:00:00Z"
}
```

## Error Handling

The adapter handles these error scenarios:

1. **Issue not found** → Create new issue
2. **API rate limit** → Retry with exponential backoff
3. **Network error** → Fallback to local storage (hybrid mode)

## Sync Protocol

### Hybrid Adapter Sync Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Write      │────▶│  File Store  │────▶│  Plane API   │
│  (primary)   │     │  (fast)      │     │  (async)     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Ack to     │
                     │   Caller     │
                     └──────────────┘
```

### Sync on Write

When `syncOnWrite: true`:
1. Write to primary adapter (file)
2. Immediately sync to secondary (Plane)
3. Return success (even if sync fails)

### Manual Sync

```bash
cognetivy sync
```

Syncs all local data to Plane:
1. List all workflows from file
2. Write each to Plane
3. List all runs from file
4. Write each to Plane

## Performance Considerations

### Batch Operations

For large datasets, consider batch API:
- Create multiple issues in one request
- Create multiple comments in one request

### Caching

Plane adapter caches:
- Workflow index (5 min TTL)
- Issue states (1 min TTL)

### Rate Limiting

Default: 100 requests/minute
- Sync respects rate limits
- Batches writes where possible

## Testing

```bash
# Test Plane connection
cognetivy test-plane

# Test hybrid mode
cognetivy init --storage hybrid --plane-url $PLANE_API_URL --plane-key $PLANE_API_KEY

# Create test workflow
cognetivy workflow create --name "Test Plane Sync"

# Start test run
cognetivy run start --input '{"test": true}'

# Verify in Plane
# Should see issue with label cognetivy:workflow
```