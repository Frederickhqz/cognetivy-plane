/**
 * Webhook handlers for Plane integration
 * 
 * Receives webhooks from Plane when issues change,
 * syncs changes back to local Cognetivy storage.
 */

import type { Request, Response } from 'express';
import type { IStorageAdapter } from './storage-interface.js';
import { FileStorageAdapter } from './adapters/file-adapter.js';
import { PlaneStorageAdapter } from './adapters/plane-adapter.js';
import { getMergedConfig, getStorageConfig } from './config.js';

// Plane webhook event types
interface PlaneWebhookEvent {
  event: 'issue.created' | 'issue.updated' | 'issue.deleted' | 'comment.created' | 'comment.updated' | 'comment.deleted';
  data: PlaneIssue | PlaneComment;
  timestamp: string;
}

interface PlaneIssue {
  id: string;
  name: string;
  description_html?: string;
  parent?: string;
  state: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  project: string;
  workspace: string;
}

interface PlaneComment {
  id: string;
  issue: string;
  comment_html: string;
  created_at: string;
  updated_at: string;
}

/**
 * Express middleware to handle Plane webhooks
 */
export function createWebhookHandler(cwd: string = process.cwd()) {
  const storageCache = new Map<string, IStorageAdapter>();
  
  return async (req: Request, res: Response) => {
    try {
      const event = req.body as PlaneWebhookEvent;
      
      // Validate webhook signature (optional, for security)
      const signature = req.headers['x-plane-signature'] as string;
      if (!validateSignature(event, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      // Get storage adapter for the project
      const storage = await getStorageForProject(event.data, cwd);
      if (!storage) {
        return res.status(200).json({ status: 'ignored', reason: 'not a cognetivy project' });
      }
      
      // Handle the event
      const result = await handleWebhookEvent(event, storage);
      
      return res.status(200).json({ status: 'ok', result });
    } catch (error) {
      console.error('Webhook handler error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  async function getStorageForProject(data: PlaneIssue | PlaneComment, cwd: string): Promise<IStorageAdapter | null> {
    const config = await getMergedConfig(cwd);
    const storageConfig = await getStorageConfig(config, cwd);
    
    // Only handle hybrid storage (which syncs to Plane)
    if (storageConfig.type !== 'hybrid') {
      return null;
    }
    
    // Check if the project matches
    const projectId = 'project' in data ? data.project : undefined;
    if (projectId && storageConfig.planeProject !== projectId) {
      return null;
    }
    
    // Return cached or create new adapter
    const cacheKey = `${storageConfig.planeWorkspace}/${storageConfig.planeProject}`;
    if (!storageCache.has(cacheKey)) {
      const { FileStorageAdapter } = await import('./adapters/file-adapter.js');
      const { PlaneStorageAdapter } = await import('./adapters/plane-adapter.js');
      const { HybridStorageAdapter } = await import('./adapters/hybrid-adapter.js');
      
      const fileAdapter = new FileStorageAdapter(storageConfig.workspaceDir);
      const planeAdapter = new PlaneStorageAdapter(
        storageConfig.planeApiUrl!,
        storageConfig.planeApiKey!,
        storageConfig.planeWorkspace!,
        storageConfig.planeProject!
      );
      
      storageCache.set(cacheKey, new HybridStorageAdapter(fileAdapter, planeAdapter));
    }
    
    return storageCache.get(cacheKey)!;
  }
}

/**
 * Validate webhook signature
 */
function validateSignature(event: PlaneWebhookEvent, signature: string | undefined): boolean {
  // TODO: Implement signature validation using shared secret
  // For now, accept all webhooks in development
  return true;
}

/**
 * Handle a webhook event
 */
async function handleWebhookEvent(event: PlaneWebhookEvent, storage: IStorageAdapter) {
  switch (event.event) {
    case 'issue.created':
    case 'issue.updated':
      return handleIssueChange(event.data as PlaneIssue, storage);
    case 'issue.deleted':
      return handleIssueDelete(event.data as PlaneIssue, storage);
    case 'comment.created':
    case 'comment.updated':
      return handleCommentChange(event.data as PlaneComment, storage);
    case 'comment.deleted':
      return handleCommentDelete(event.data as PlaneComment, storage);
    default:
      return { status: 'ignored', reason: 'unknown event type' };
  }
}

/**
 * Handle issue creation/update
 */
async function handleIssueChange(issue: PlaneIssue, storage: IStorageAdapter) {
  // Extract metadata from description
  const metaMatch = issue.description_html?.match(/```cognetivy\n(\{[^}]+\})\n```/);
  if (!metaMatch) {
    return { status: 'ignored', reason: 'not a cognetivy entity' };
  }
  
  try {
    const meta = JSON.parse(metaMatch[1]);
    
    if (meta.t === 'workflow') {
      // Sync workflow to local
      const workflow = {
        workflow_id: meta.i,
        name: issue.name,
        description: issue.description_html?.replace(/\n\n---\n```cognetivy\n\{[^}]+\}\n```/, '').trim() || '',
        current_version_id: meta.v || '',
        created_at: issue.created_at,
      };
      
      await storage.writeWorkflowRecord(workflow);
      return { status: 'synced', type: 'workflow', id: workflow.workflow_id };
    }
    
    if (meta.t === 'run') {
      // Sync run to local
      const run = {
        run_id: meta.i,
        name: issue.name,
        workflow_id: issue.parent || '',
        workflow_version_id: meta.v || '',
        status: mapPlaneStateToRunStatus(issue.state),
        input: parseInputFromDescription(issue.description_html),
        created_at: issue.created_at,
      };
      
      await storage.createRun(run);
      return { status: 'synced', type: 'run', id: run.run_id };
    }
    
    return { status: 'ignored', reason: 'unknown cognetivy type' };
  } catch (error) {
    return { status: 'error', error: String(error) };
  }
}

/**
 * Handle issue deletion
 */
async function handleIssueDelete(issue: PlaneIssue, storage: IStorageAdapter) {
  // Note: Cognetivy doesn't have a delete operation in IStorageAdapter
  // This could be added later
  return { status: 'ignored', reason: 'delete not supported' };
}

/**
 * Handle comment creation/update
 */
async function handleCommentChange(comment: PlaneComment, storage: IStorageAdapter) {
  // Check if comment contains cognetivy metadata
  if (!comment.comment_html.includes('data-type="')) {
    return { status: 'ignored', reason: 'not a cognetivy entity' };
  }
  
  // Extract type from comment
  const typeMatch = comment.comment_html.match(/data-type="([^"]+)"/);
  if (!typeMatch) {
    return { status: 'ignored', reason: 'unknown cognetivy entity' };
  }
  
  const type = typeMatch[1];
  
  // Handle different comment types
  switch (type) {
    case 'event':
      // Parse event and append to run
      return handleEventComment(comment, storage);
    case 'collection':
      // Update collection
      return handleCollectionComment(comment, storage);
    case 'node-result':
      // Update node result
      return handleNodeResultComment(comment, storage);
    default:
      return { status: 'ignored', reason: 'unknown comment type' };
  }
}

/**
 * Handle comment deletion
 */
async function handleCommentDelete(comment: PlaneComment, storage: IStorageAdapter) {
  return { status: 'ignored', reason: 'comment delete not supported' };
}

/**
 * Handle event comment
 */
async function handleEventComment(comment: PlaneComment, storage: IStorageAdapter) {
  const typeMatch = comment.comment_html.match(/data-event-type="([^"]+)"/);
  const tsMatch = comment.comment_html.match(/data-ts="([^"]+)"/);
  const byMatch = comment.comment_html.match(/by (\w+)/);
  const codeMatch = comment.comment_html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/);
  
  if (!typeMatch || !comment.issue) {
    return { status: 'error', error: 'missing event metadata' };
  }
  
  const event = {
    type: typeMatch[1] as any,
    ts: tsMatch?.[1] || new Date().toISOString(),
    by: byMatch?.[1] || 'plane',
    data: codeMatch ? JSON.parse(codeMatch[1]) : {},
  };
  
  await storage.appendEvent(comment.issue, event);
  return { status: 'synced', type: 'event', runId: comment.issue };
}

/**
 * Handle collection comment
 */
async function handleCollectionComment(comment: PlaneComment, storage: IStorageAdapter) {
  const kindMatch = comment.comment_html.match(/data-kind="([^"]+)"/);
  const codeMatch = comment.comment_html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/);
  
  if (!kindMatch || !comment.issue) {
    return { status: 'error', error: 'missing collection metadata' };
  }
  
  const kind = kindMatch[1];
  const collection = codeMatch ? JSON.parse(codeMatch[1]) : { items: [], kind };
  
  await storage.writeCollection(comment.issue, kind, collection);
  return { status: 'synced', type: 'collection', runId: comment.issue, kind };
}

/**
 * Handle node result comment
 */
async function handleNodeResultComment(comment: PlaneComment, storage: IStorageAdapter) {
  const nodeMatch = comment.comment_html.match(/data-node-id="([^"]+)"/);
  const codeMatch = comment.comment_html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/);
  
  if (!nodeMatch || !comment.issue) {
    return { status: 'error', error: 'missing node result metadata' };
  }
  
  const nodeId = nodeMatch[1];
  const result = codeMatch ? JSON.parse(codeMatch[1]) : {};
  
  await storage.writeNodeResult(comment.issue, nodeId, result);
  return { status: 'synced', type: 'node-result', runId: comment.issue, nodeId };
}

/**
 * Map Plane state to run status
 */
function mapPlaneStateToRunStatus(state: string): 'running' | 'completed' | 'failed' {
  const statusMap: Record<string, 'running' | 'completed' | 'failed'> = {
    'in_progress': 'running',
    'done': 'completed',
    'cancelled': 'failed',
    'backlog': 'running',
    'todo': 'running',
  };
  return statusMap[state] || 'running';
}

/**
 * Parse input from description
 */
function parseInputFromDescription(description?: string): Record<string, unknown> {
  if (!description) return {};
  
  // Remove metadata block and parse
  const cleaned = description.replace(/\n\n---\n```cognetivy\n\{[^}]+\}\n```/, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

/**
 * Start webhook server
 */
export function startWebhookServer(port: number = 3000, cwd: string = process.cwd()) {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  // Webhook endpoint
  app.post('/webhooks/plane', createWebhookHandler(cwd));
  
  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  return app.listen(port, () => {
    console.log(`Cognetivy webhook server listening on port ${port}`);
  });
}