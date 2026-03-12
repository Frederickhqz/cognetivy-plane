# Embedding Cognetivy in Plane

Cognetivy provides embeddable views that can be embedded in Plane using iframes or custom views.

## Embed URLs

### Runs View
```
/embed/runs?projectId=<PROJECT_ID>
```

Displays workflow runs for a project. Embed in Plane project sidebar.

### Workflow Editor
```
/embed/workflow/<WORKFLOW_ID>
```

Displays a workflow editor. Embed in Plane issue detail view.

## Styling

### Plane Theme

Apply the Plane theme by adding `theme-plane` class to the root element:

```html
<div class="theme-plane">
  <!-- Cognetivy content -->
</div>
```

### CSS Variables

Override Cognetivy's CSS variables to match Plane:

```css
:root {
  --primary: var(--color-primary-50); /* #6351FF */
  --background: #FFFFFF;
  --foreground: #0D0D0D;
  --muted: #F3F1FF;
  --border: #D9D9D9;
}
```

## iframe Integration

### Basic iframe

```html
<iframe
  src="http://localhost:3744/embed/runs?projectId=PLANE_PROJECT_ID"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

### With iframe-resizer

For automatic height adjustment:

```html
<script src="https://cdn.jsdelivr.net/npm/iframe-resizer@4.3.2/js/iframeResizer.min.js"></script>
<iframe
  id="cognetivy-runs"
  src="http://localhost:3744/embed/runs?projectId=PLANE_PROJECT_ID"
  width="100%"
  frameborder="0"
></iframe>
<script>
  iframeResize({ log: false }, '#cognetivy-runs');
</script>
```

## Authentication

### API Key

Pass the Plane API key via URL parameter:

```
/embed/runs?projectId=PLANE_PROJECT_ID&apiKey=<API_KEY>
```

**Warning:** This exposes the API key in the URL. Use only in secure contexts.

### Cookie-based

If Cognetivy is hosted on the same domain as Plane, cookies can be shared:

```
/embed/runs?projectId=PLANE_PROJECT_ID
```

Cognetivy will use the same session cookies as Plane.

## Cross-Origin Communication

Use `postMessage` for parent-child communication:

```javascript
// In Plane (parent)
const iframe = document.getElementById('cognetivy-iframe');

// Listen for messages from Cognetivy
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:3744') return;
  
  if (event.data.type === 'run-selected') {
    console.log('Selected run:', event.data.runId);
  }
});

// Send message to Cognetivy
iframe.contentWindow.postMessage({
  type: 'filter-status',
  status: 'running'
}, 'http://localhost:3744');
```

```javascript
// In Cognetivy (child)
window.parent.postMessage({
  type: 'run-selected',
  runId: 'run_123'
}, '*');
```

## Example: Custom Plane View

### Step 1: Create Custom View in Plane

1. Go to Settings > Views > Create View
2. Name: "Workflow Runs"
3. Query: (leave empty for all issues)

### Step 2: Add iframe in View Description

In the view's custom HTML:

```html
<div style="height: 600px; overflow: hidden;">
  <iframe
    src="http://YOUR_COGNETIVY_HOST/embed/runs?projectId=${project.id}"
    width="100%"
    height="100%"
    frameborder="0"
    style="border: none;"
  ></iframe>
</div>
```

### Step 3: Configure CORS

If Cognetivy is on a different domain, configure CORS:

```javascript
// In Cognetivy's API server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://your-plane-instance.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

## Theme Matching

Cognetivy uses shadcn/ui which can be themed to match Plane:

```typescript
// In studio/src/index.css
:root {
  --primary: #6351FF;      /* Plane primary */
  --primary-foreground: #FFFFFF;
  --background: #FFFFFF;
  --foreground: #0D0D0D;
  --muted: #F3F1FF;
  --muted-foreground: #3D3D40;
  --border: #D9D9D9;
  --radius: 0.5rem;       /* Plane uses 8px radius */
}
```

## Production Setup

### 1. Build Studio

```bash
cd cognetivy-plane/studio
npm run build
```

### 2. Serve Static Files

Configure your web server to serve the `dist/` folder:

```nginx
# nginx.conf
server {
  listen 80;
  server_name cognetivy.yourdomain.com;

  location / {
    root /var/www/cognetivy/studio/dist;
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://localhost:3001;
  }
}
```

### 3. Configure Environment

Set environment variables:

```bash
PLANE_API_URL=https://your-plane-instance.com
PLANE_API_KEY=your-api-key
PLANE_WORKSPACE=your-workspace
PLANE_PROJECT=your-project-id
```

### 4. Enable in Plane

Create a custom view or page that embeds Cognetivy via iframe.