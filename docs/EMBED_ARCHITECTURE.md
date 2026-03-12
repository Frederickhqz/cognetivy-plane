# Cognetivy + Plane Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PLANE INSTANCE                                  │
│                     http://168.231.69.92:54617                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Project View                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Custom View (iframe)                       │   │   │
│  │  │                                                               │   │   │
│  │  │   ┌─────────────────────────────────────────────────────┐   │   │   │
│  │  │   │              Cognetivy Embed                         │   │   │   │
│  │  │   │                                                       │   │   │   │
│  │  │   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │   │   │
│  │  │   │   │   Run 1     │  │   Run 2     │  │   Run 3     │ │   │   │   │
│  │  │   │   │   ✅ Done   │  │   🔄 Running │  │   ⏳ Queued │ │   │   │   │
│  │  │   │   └─────────────┘  └─────────────┘  └─────────────┘ │   │   │   │
│  │  │   │                                                       │   │   │   │
│  │  │   │   src: http://localhost:4173/embed/runs?projectId=... │   │   │   │
│  │  │   └─────────────────────────────────────────────────────┘   │   │   │
│  │  │                                                               │   │   │
│  │  │   <iframe> with iframe-resizer for dynamic height            │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Issue Detail View                           │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              Workflow Editor Embed                           │   │   │
│  │  │                                                               │   │   │
│  │  │   ┌─────────┐     ┌─────────┐     ┌─────────┐              │   │   │
│  │  │   │  Node1  │────▶│  Node2  │────▶│  Node3  │              │   │   │
│  │  │   │ Extract │     │ Process │     │ Output  │              │   │   │
│  │  │   └─────────┘     └─────────┘     └─────────┘              │   │   │
│  │  │                                                               │   │   │
│  │  │   src: http://localhost:4173/embed/workflow/:id              │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ iframe + postMessage
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COGNETIVY STUDIO                                   │
│                         http://localhost:4173                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Embed Routes                                 │   │
│  │                                                                      │   │
│  │   /embed/runs?projectId=PLANE                                        │   │
│  │   /embed/workflow/:id                                                │   │
│  │                                                                      │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │  RunsEmbed.tsx                                              │   │   │
│  │   │  - Table of workflow runs                                   │   │   │
│  │   │  - Inline styles (no CSS dependency)                         │   │   │
│  │   │  - postMessage for run selection                            │   │   │
│  │   │  - iframe-resizer auto-height                               │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │  WorkflowEditorEmbed.tsx                                    │   │   │
│  │   │  - Workflow visualization                                    │   │   │
│  │   │  - Node interactions                                         │   │   │
│  │   │  - postMessage for node selection                           │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Theme System                                 │   │
│  │                                                                      │   │
│  │   themes/plane.css                                                   │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │  .theme-plane {                                             │   │   │
│  │   │    --primary: #6351FF;                                       │   │   │
│  │   │    --background: #FFFFFF;                                    │   │   │
│  │   │    --foreground: #0D0D0D;                                    │   │   │
│  │   │    --muted: #F3F1FF;                                         │   │   │
│  │   │    --border: #D9D9D9;                                        │   │   │
│  │   │  }                                                           │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ API calls
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COGNETIVY CLI                                       │
│                         http://localhost:3742                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Storage Adapters                                │   │
│  │                                                                      │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │   │
│  │   │ FileAdapter   │  │ PlaneAdapter │  │ HybridAdapter │            │   │
│  │   │              │  │              │  │              │            │   │
│  │   │ .cognetivy/  │  │ Plane API    │  │ File + Plane │            │   │
│  │   │              │  │              │  │ (sync both) │            │   │
│  │   └──────────────┘  └──────────────┘  └──────────────┘            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       Webhook Server                                 │   │
│  │                                                                      │   │
│  │   POST /webhooks/plane                                               │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │  - Receive Plane issue events                                 │   │   │
│  │   │  - Sync changes back to local                                │   │   │
│  │   │  - CORS enabled for Plane origins                             │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐     iframe      ┌──────────────┐     API      ┌──────────────┐
│              │ ────────────────▶│              │─────────────▶│              │
│    Plane     │                  │  Cognetivy   │              │  Cognetivy   │
│  (Browser)   │ ◀──────────────── │   Studio     │◀────────────│     CLI      │
│              │   postMessage    │  (Vite)      │   Storage   │   (Node)     │
└──────────────┘                  └──────────────┘              └──────────────┘
                                                                  │
                                                                  │ REST API
                                                                  ▼
                                                          ┌──────────────┐
                                                          │              │
                                                          │    Plane     │
                                                          │   Instance   │
                                                          │  (Django)    │
                                                          └──────────────┘
```

## Communication Protocols

### iframe Embedding
```html
<iframe src="http://localhost:4173/embed/runs" />
```
- Child sends height updates via postMessage
- Parent resizes iframe automatically
- No CSS dependency (inline styles)

### postMessage Events

**Run Selected:**
```javascript
{ type: 'run-selected', runId: 'run_abc123' }
```

**Node Selected:**
```javascript
{ type: 'node-selected', nodeId: 'node_xyz' }
```

**Height Update:**
```javascript
{ type: 'resize', height: 600 }
```

## CORS Configuration

Allowed Origins:
- `http://localhost:3000`
- `http://localhost:4200`
- `http://localhost:8000`
- `http://localhost:54617`
- `http://168.231.69.92:54617`

Headers:
```
Access-Control-Allow-Origin: <origin>
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

## File Structure

```
cognetivy-plane/
├── studio/
│   ├── src/
│   │   ├── components/
│   │   │   └── embed/
│   │   │       ├── RunsEmbed.tsx        # Runs table embed
│   │   │       └── WorkflowEditorEmbed.tsx  # Workflow editor embed
│   │   ├── themes/
│   │   │   └── plane.css                # Plane design tokens
│   │   └── App.tsx                      # Routes including /embed/*
│   └── vite.config.ts                   # CORS config
├── cli/
│   └── src/
│       └── webhooks.ts                   # Webhook server + CORS
├── docs/
│   ├── PLANE_EMBED.md                   # Embedding guide
│   ├── DEMO_SCRIPT.md                   # Demo walkthrough
│   └── ARCHITECTURE.md                  # This file
└── examples/
    ├── embed-runs.html                  # Simple runs embed
    ├── embed-workflow.html              # Simple workflow embed
    └── embed-test.html                  # Comprehensive test page
```