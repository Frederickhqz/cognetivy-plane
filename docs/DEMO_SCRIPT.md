# Cognetivy + Plane Integration Demo Script

## Overview
This demo shows how to embed Cognetivy workflow views into Plane for seamless project management.

## Prerequisites
- Cognetivy Studio running on `http://localhost:4173`
- Plane instance running on `http://168.231.69.92:54617`
- Project ID: `PLANE`

## Demo Flow

### Part 1: Embed Test Page (30 seconds)

1. Open `examples/embed-test.html` in browser
2. Show both embed views loading
3. Verify iframe-resizer is working (height adjusts automatically)
4. Test CORS preflight button

**Key Points:**
- Runs embed shows workflow runs table
- Workflow editor shows workflow visualization
- iframe-resizer enables automatic height adjustment
- CORS allows cross-origin requests from Plane

### Part 2: Plane Integration (60 seconds)

1. Open Plane instance: `http://168.231.69.92:54617`
2. Navigate to Settings → Views → Create View
3. Name: "Workflow Runs"
4. In custom HTML, paste:

```html
<div style="height: 600px; overflow: hidden;">
  <iframe
    src="http://localhost:4173/embed/runs?projectId=${project.id}"
    width="100%"
    height="100%"
    frameborder="0"
    style="border: none;"
  ></iframe>
</div>
<script src="https://cdn.jsdelivr.net/npm/iframe-resizer@4.3.2/js/iframeResizer.min.js"></script>
<script>
  iframeResize({ log: false }, 'iframe');
</script>
```

5. Save and view the embedded runs

**Key Points:**
- `${project.id}` is replaced by Plane automatically
- iframe-resizer handles dynamic height
- Theme matches Plane design system

### Part 3: Workflow Editor in Issue View (30 seconds)

1. Create a custom field or page in Plane for workflows
2. Embed workflow editor:

```html
<iframe
  id="cognetivy-workflow"
  src="http://localhost:4173/embed/workflow/wf_default"
  width="100%"
  height="800"
  frameborder="0"
></iframe>
```

3. Show workflow nodes and interactions
4. Demonstrate postMessage communication (click node → parent receives event)

## Technical Details

### iframe-resizer Setup
```html
<script src="https://cdn.jsdelivr.net/npm/iframe-resizer@4.3.2/js/iframeResizer.min.js"></script>
<script>
  iframeResize({ log: true }, '#cognetivy-runs');
</script>
```

### postMessage Communication
```javascript
// Parent (Plane) receives messages
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:4173') return;
  
  if (event.data.type === 'run-selected') {
    console.log('Run selected:', event.data.runId);
  }
  if (event.data.type === 'node-selected') {
    console.log('Node selected:', event.data.nodeId);
  }
});
```

### CORS Headers
```
Access-Control-Allow-Origin: http://168.231.69.92:54617
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

## Theme Matching

The embed components use Plane's design tokens:

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#6351FF` | Buttons, links |
| Background | `#FFFFFF` | Page background |
| Foreground | `#0D0D0D` | Primary text |
| Muted | `#F3F1FF` | Hover states |
| Border | `#D9D9D9` | Borders, dividers |

## Embed URLs

| View | URL | Purpose |
|------|-----|---------|
| Runs | `/embed/runs?projectId=PLANE` | Project sidebar |
| Workflow Editor | `/embed/workflow/:id` | Issue detail view |

## Demo Checklist

- [ ] Start Cognetivy Studio: `npm run preview`
- [ ] Verify Plane is accessible
- [ ] Open embed-test.html in browser
- [ ] Test both embed views
- [ ] Test CORS preflight
- [ ] Create Plane custom view
- [ ] Add iframe embed
- [ ] Verify theme matching
- [ ] Test postMessage events

## Next Steps

1. **Deploy Cognetivy** to production URL
2. **Update CORS origins** to include production Plane URL
3. **Create Plane App Manifest** for official integration
4. **Add authentication bridge** for user context
5. **Phase 4**: Agent Integration (MCP + SKILL)