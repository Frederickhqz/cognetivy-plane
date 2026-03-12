/**
 * Plane Storage Adapter for Cognetivy
 * 
 * Maps Cognetivy models to Plane API:
 * - Workflow → Issue (type: workflow)
 * - Run → Issue (type: workflow_run, parent: workflow)
 * - Collection → Issue Comment (JSON payload)
 * - Event → Issue Comment (event log)
 * - Node Result → Activity Log
 */

import type {
  WorkflowIndexRecord,
  WorkflowRecord,
  WorkflowVersionRecord,
  RunRecord,
  EventPayload,
  CollectionSchemaConfig,
  CollectionStore,
  CollectionItem,
  NodeResultRecord,
  EventType,
} from '../models.js';
import type { IStorageAdapter, SyncResult, SyncError } from '../storage-interface.js';

// Plane API Types
interface PlaneIssue {
  id: string;
  name: string;
  description_html?: string;
  parent?: string;
  state: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  extra_props?: Record<string, unknown>;
}

interface PlaneComment {
  id: string;
  issue: string;
  comment_html: string;
  created_at: string;
  updated_at: string;
}

// Custom issue types for Cognetivy
const COGNETIVY_ISSUE_TYPES = {
  workflow: 'workflow',
  workflow_run: 'workflow_run',
} as const;

// Labels for Cognetivy entities (optional - stored in extra_props instead)
// Note: If using labels, must be UUIDs created in Plane project settings
const COGNETIVY_LABELS = {
  // workflow: '86b512aa-c399-41aa-aeb2-3bc14f0b06c8', // cognetivy:workflow
  // run: 'e97d7da7-a866-48e8-b658-9db7dee49e09', // cognetivy:run
} as const;

// States
const RUN_STATES = {
  running: 'running',
  completed: 'completed',
  failed: 'failed',
} as const;

export class PlaneStorageAdapter implements IStorageAdapter {
  private apiUrl: string;
  private apiKey: string;
  private workspace: string;
  private project: string;
  private headers: Record<string, string>;

  constructor(
    apiUrl: string,
    apiKey: string,
    workspace: string,
    project: string
  ) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.workspace = workspace;
    this.project = project;
    this.headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  // ============ Workflow Operations ============

  async readWorkflowIndex(): Promise<WorkflowIndexRecord> {
    // Fetch all issues and filter by cognetivy metadata in description_html
    const issues = await this.fetchIssues({});
    
    const workflows = issues
      .filter(issue => issue.description_html?.includes('```cognetivy\n'))
      .filter(issue => {
        const metaMatch = issue.description_html?.match(/```cognetivy\n(\{[^}]+\})\n```/);
        if (metaMatch) {
          try {
            const meta = JSON.parse(metaMatch[1]);
            return meta.t === 'workflow';
          } catch {
            return false;
          }
        }
        return false;
      })
      .map(issue => this.parseWorkflowFromIssue(issue));
    
    // Current workflow is the most recently updated one, or we store it in project settings
    const currentWorkflowId = workflows[0]?.workflow_id || 'default';
    
    return {
      current_workflow_id: currentWorkflowId,
      workflows,
    };
  }

  async writeWorkflowIndex(index: WorkflowIndexRecord): Promise<void> {
    // Store current workflow ID in project settings or as a special issue
    // For now, we'll just ensure all workflows exist
    for (const workflow of index.workflows) {
      await this.writeWorkflowRecord(workflow as WorkflowRecord);
    }
  }

  async listWorkflows(): Promise<WorkflowRecord[]> {
    const issues = await this.fetchIssues({});
    return issues
      .filter(issue => {
        if (!issue.description_html?.includes('```cognetivy\n')) return false;
        const metaMatch = issue.description_html.match(/```cognetivy\n(\{[^}]+\})\n```/);
        if (metaMatch) {
          try {
            const meta = JSON.parse(metaMatch[1]);
            return meta.t === 'workflow';
          } catch {
            return false;
          }
        }
        return false;
      })
      .map(issue => this.parseWorkflowFromIssue(issue) as WorkflowRecord);
  }

  async readWorkflowRecord(workflowId: string): Promise<WorkflowRecord> {
    const issue = await this.fetchIssue(workflowId);
    return this.parseWorkflowFromIssue(issue) as WorkflowRecord;
  }

  async writeWorkflowRecord(workflow: WorkflowRecord): Promise<void> {
    // Check if issue exists
    try {
      const existing = await this.fetchIssue(workflow.workflow_id);
      // Update existing issue (include id for update)
      await this.updateIssue(workflow.workflow_id, this.workflowToIssue(workflow, true));
    } catch {
      // Create new issue (don't include id - Plane generates it)
      const created = await this.createIssue(this.workflowToIssue(workflow, false));
      // Note: Created issue will have a new Plane-generated ID, not workflow.workflow_id
      console.error(`Created workflow issue ${created.id} for workflow ${workflow.workflow_id}`);
    }
  }

  // ============ Workflow Version Operations ============

  async readWorkflowVersion(workflowId: string, versionId: string): Promise<WorkflowVersionRecord> {
    // Versions are stored as comments on the workflow issue
    const comments = await this.fetchComments(workflowId);
    const versionComment = comments.find(c => 
      c.comment_html.includes(`data-version-id="${versionId}"`)
    );
    
    if (!versionComment) {
      throw new Error(`Version ${versionId} not found for workflow ${workflowId}`);
    }
    
    return this.parseVersionFromComment(versionComment);
  }

  async writeWorkflowVersion(version: WorkflowVersionRecord): Promise<void> {
    const commentHtml = this.versionToCommentHtml(version);
    await this.createComment(version.workflow_id, commentHtml);
  }

  async listWorkflowVersions(workflowId: string): Promise<WorkflowVersionRecord[]> {
    const comments = await this.fetchComments(workflowId);
    return comments
      .filter(c => c.comment_html.includes('data-type="workflow-version"'))
      .map(c => this.parseVersionFromComment(c));
  }

  // ============ Run Operations ============

  async createRun(run: RunRecord): Promise<void> {
    // Create new issue (don't include id - Plane generates it)
    await this.createIssue(this.runToIssue(run, false));
  }

  async readRun(runId: string): Promise<RunRecord> {
    const issue = await this.fetchIssue(runId);
    return this.parseRunFromIssue(issue);
  }

  async updateRun(run: RunRecord): Promise<void> {
    // Update existing issue (include id for update)
    await this.updateIssue(run.run_id, this.runToIssue(run, true));
  }

  async listRuns(workflowId?: string): Promise<RunRecord[]> {
    const filters: Record<string, unknown> = {};
    if (workflowId) {
      filters.parent = workflowId;
    }
    
    const issues = await this.fetchIssues(filters);
    return issues
      .filter(issue => {
        if (!issue.description_html?.includes('```cognetivy\n')) return false;
        const metaMatch = issue.description_html.match(/```cognetivy\n(\{[^}]+\})\n```/);
        if (metaMatch) {
          try {
            const meta = JSON.parse(metaMatch[1]);
            return meta.t === 'run';
          } catch {
            return false;
          }
        }
        return false;
      })
      .map(issue => this.parseRunFromIssue(issue));
  }

  // ============ Event Operations ============

  async appendEvent(runId: string, event: EventPayload): Promise<void> {
    const commentHtml = this.eventToCommentHtml(event);
    await this.createComment(runId, commentHtml);
  }

  async listEvents(runId: string): Promise<EventPayload[]> {
    const comments = await this.fetchComments(runId);
    return comments
      .filter(c => c.comment_html.includes('data-type="event"'))
      .map(c => this.parseEventFromComment(c));
  }

  // ============ Collection Operations ============

  async readCollectionSchema(workflowId: string): Promise<CollectionSchemaConfig> {
    // Schema is stored as a comment on the workflow issue
    const comments = await this.fetchComments(workflowId);
    const schemaComment = comments.find(c => 
      c.comment_html.includes('data-type="collection-schema"')
    );
    
    if (!schemaComment) {
      return this.getDefaultCollectionSchema(workflowId);
    }
    
    return this.parseSchemaFromComment(schemaComment);
  }

  async writeCollectionSchema(schema: CollectionSchemaConfig): Promise<void> {
    const commentHtml = this.schemaToCommentHtml(schema);
    await this.createComment(schema.workflow_id, commentHtml);
  }

  async readCollection(runId: string, kind: string): Promise<CollectionStore> {
    // Collections are stored as comments on the run issue
    const comments = await this.fetchComments(runId);
    const collectionComment = comments.find(c => 
      c.comment_html.includes(`data-kind="${kind}"`) && 
      c.comment_html.includes('data-type="collection"')
    );
    
    if (!collectionComment) {
      // Return empty collection with defaults
      return {
        run_id: runId,
        workflow_id: '',
        workflow_version_id: '',
        kind,
        updated_at: new Date().toISOString(),
        items: [],
      };
    }
    
    return this.parseCollectionFromComment(collectionComment);
  }

  async writeCollection(runId: string, kind: string, collection: CollectionStore): Promise<void> {
    const commentHtml = this.collectionToCommentHtml(kind, collection);
    await this.createComment(runId, commentHtml);
  }

  async appendCollectionItem(runId: string, kind: string, item: CollectionItem): Promise<void> {
    const collection = await this.readCollection(runId, kind);
    collection.items.push(item);
    await this.writeCollection(runId, kind, collection);
  }

  // ============ Node Result Operations ============

  async readNodeResult(runId: string, nodeId: string): Promise<NodeResultRecord | null> {
    const comments = await this.fetchComments(runId);
    const resultComment = comments.find(c => 
      c.comment_html.includes(`data-node-id="${nodeId}"`) &&
      c.comment_html.includes('data-type="node-result"')
    );
    
    if (!resultComment) {
      return null;
    }
    
    return this.parseNodeResultFromComment(resultComment);
  }

  async writeNodeResult(runId: string, nodeId: string, result: NodeResultRecord): Promise<void> {
    const commentHtml = this.nodeResultToCommentHtml(nodeId, result);
    await this.createComment(runId, commentHtml);
  }

  async listNodeResults(runId: string): Promise<NodeResultRecord[]> {
    const comments = await this.fetchComments(runId);
    return comments
      .filter(c => c.comment_html.includes('data-type="node-result"'))
      .map(c => this.parseNodeResultFromComment(c));
  }

  // ============ Sync Operations ============

  async sync(): Promise<SyncResult> {
    // For Plane adapter, sync is a no-op (data is always in sync)
    // This is mainly used by HybridStorageAdapter
    return {
      workflowsSynced: 0,
      runsSynced: 0,
      collectionsSynced: 0,
      errors: [],
    };
  }

  // ============ Private Helper Methods ============

  private async fetchIssues(filters: Record<string, unknown>): Promise<PlaneIssue[]> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        params.append(key, value.join(','));
      } else {
        params.append(key, String(value));
      }
    }
    
    const response = await fetch(
      `${this.apiUrl}/api/v1/workspaces/${this.workspace}/projects/${this.project}/issues/?${params}`,
      { headers: this.headers }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.results || [];
  }

  private async fetchIssue(id: string): Promise<PlaneIssue> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/workspaces/${this.workspace}/projects/${this.project}/issues/${id}/`,
      { headers: this.headers }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch issue ${id}: ${response.statusText}`);
    }
    
    return response.json();
  }

  private async createIssue(data: Partial<PlaneIssue>): Promise<PlaneIssue> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/workspaces/${this.workspace}/projects/${this.project}/issues/`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to create issue: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to create issue: ${response.statusText}`);
    }
    
    return response.json();
  }

  private async updateIssue(id: string, data: Partial<PlaneIssue>): Promise<PlaneIssue> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/workspaces/${this.workspace}/projects/${this.project}/issues/${id}/`,
      {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(data),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to update issue ${id}: ${response.statusText}`);
    }
    
    return response.json();
  }

  private async fetchComments(issueId: string): Promise<PlaneComment[]> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/workspaces/${this.workspace}/projects/${this.project}/issues/${issueId}/comments/`,
      { headers: this.headers }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch comments for issue ${issueId}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.results || [];
  }

  private async createComment(issueId: string, html: string): Promise<PlaneComment> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/workspaces/${this.workspace}/projects/${this.project}/issues/${issueId}/comments/`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ comment_html: html }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to create comment: ${response.statusText}`);
    }
    
    return response.json();
  }

  // ============ Conversion Methods ============

  private workflowToIssue(workflow: WorkflowRecord, includeId: boolean = false): Partial<PlaneIssue> {
    // Embed metadata as plain text at end of description (survives HTML sanitization)
    const metaJson = JSON.stringify({
      t: 'workflow', // type
      i: workflow.workflow_id, // id
      v: workflow.current_version_id || '', // version
    });
    const metaText = `\n\n---\n\`\`\`cognetivy\n${metaJson}\n\`\`\``;
    const descriptionHtml = (workflow.description || '') + metaText;
    
    const issue: Partial<PlaneIssue> = {
      name: workflow.name,
      description_html: descriptionHtml,
    };
    if (includeId) {
      issue.id = workflow.workflow_id;
    }
    return issue;
  }

  private parseWorkflowFromIssue(issue: PlaneIssue): WorkflowRecord {
    // Extract metadata from code block in description_html
    const metaMatch = issue.description_html?.match(/```cognetivy\n(\{[^}]+\})\n```/);
    let cognetivyId = issue.id;
    let currentVersion = '';
    
    if (metaMatch) {
      try {
        const meta = JSON.parse(metaMatch[1]);
        cognetivyId = meta.i || issue.id;
        currentVersion = meta.v || '';
      } catch {
        // Fallback to issue.id
      }
    }
    
    // Remove metadata block from description
    const description = issue.description_html
      ?.replace(/\n\n---\n```cognetivy\n\{[^}]+\}\n```/, '')
      ?.replace(/<span>/, '')
      ?.replace(/<\/span>$/, '')
      ?.trim() || '';
    
    return {
      workflow_id: cognetivyId,
      name: issue.name,
      description: description,
      current_version_id: currentVersion,
      created_at: issue.created_at,
    };
  }

  private runToIssue(run: RunRecord, includeId: boolean = false): Partial<PlaneIssue> {
    // Embed metadata as plain text in description (survives HTML sanitization)
    const metaJson = JSON.stringify({
      t: 'run',
      i: run.run_id,
      v: run.workflow_version_id || '',
    });
    const metaText = `\n\n---\n\`\`\`cognetivy\n${metaJson}\n\`\`\``;
    const descriptionHtml = JSON.stringify(run.input) + metaText;
    
    const issue: Partial<PlaneIssue> = {
      name: run.name || `Run ${run.run_id.slice(0, 8)}`,
      parent: run.workflow_id,
      description_html: descriptionHtml,
      state: this.runStatusToState(run.status),
    };
    if (includeId) {
      issue.id = run.run_id;
    }
    return issue;
  }

  private parseRunFromIssue(issue: PlaneIssue): RunRecord {
    // Extract metadata from code block in description_html
    const metaMatch = issue.description_html?.match(/```cognetivy\n(\{[^}]+\})\n```/);
    let cognetivyId = issue.id;
    let workflowVersion = '';
    
    if (metaMatch) {
      try {
        const meta = JSON.parse(metaMatch[1]);
        cognetivyId = meta.i || issue.id;
        workflowVersion = meta.v || '';
      } catch {
        // Fallback to issue.id
      }
    }
    
    // Remove metadata block and parse input
    const inputStr = issue.description_html
      ?.replace(/\n\n---\n```cognetivy\n\{[^}]+\}\n```/, '')
      ?.replace(/<span>/, '')
      ?.replace(/<\/span>$/, '')
      ?.trim() || '{}';
    
    return {
      run_id: cognetivyId,
      name: issue.name,
      workflow_id: issue.parent || '',
      workflow_version_id: workflowVersion,
      status: this.stateToRunStatus(issue.state),
      input: inputStr ? JSON.parse(inputStr) : {},
      created_at: issue.created_at,
      final_answer: undefined, // Not stored in Plane currently
    };
  }

  private runStatusToState(status: string): string {
    const stateMap: Record<string, string> = {
      running: 'in_progress',
      completed: 'done',
      failed: 'cancelled',
    };
    return stateMap[status] || 'backlog';
  }

  private stateToRunStatus(state: string): 'running' | 'completed' | 'failed' {
    const statusMap: Record<string, 'running' | 'completed' | 'failed'> = {
      in_progress: 'running',
      done: 'completed',
      cancelled: 'failed',
    };
    return statusMap[state] || 'failed';
  }

  private versionToCommentHtml(version: WorkflowVersionRecord): string {
    return `<div data-type="workflow-version" data-version-id="${version.version_id}">
<pre><code>${JSON.stringify(version, null, 2)}</code></pre>
</div>`;
  }

  private parseVersionFromComment(comment: PlaneComment): WorkflowVersionRecord {
    const match = comment.comment_html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('Invalid version comment format');
  }

  private eventToCommentHtml(event: EventPayload): string {
    return `<div data-type="event" data-event-type="${event.type}" data-ts="${event.ts}">
<strong>${event.type}</strong> by ${event.by}
<pre><code>${JSON.stringify(event.data, null, 2)}</code></pre>
</div>`;
  }

  private parseEventFromComment(comment: PlaneComment): EventPayload {
    const typeMatch = comment.comment_html.match(/data-event-type="([^"]+)"/);
    const tsMatch = comment.comment_html.match(/data-ts="([^"]+)"/);
    const byMatch = comment.comment_html.match(/by (\w+)/);
    const codeMatch = comment.comment_html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/);
    
    return {
      type: (typeMatch?.[1] as EventType) || 'run_started',
      ts: tsMatch?.[1] || new Date().toISOString(),
      by: byMatch?.[1] || 'agent',
      data: codeMatch ? JSON.parse(codeMatch[1]) : {},
    };
  }

  private collectionToCommentHtml(kind: string, collection: CollectionStore): string {
    return `<div data-type="collection" data-kind="${kind}">
<pre><code>${JSON.stringify(collection, null, 2)}</code></pre>
</div>`;
  }

  private parseCollectionFromComment(comment: PlaneComment): CollectionStore {
    const match = comment.comment_html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/);
    if (match) {
      return JSON.parse(match[1]);
    }
    // Return empty collection with defaults
    return {
      run_id: '',
      workflow_id: '',
      workflow_version_id: '',
      kind: '',
      updated_at: new Date().toISOString(),
      items: [],
    };
  }

  private schemaToCommentHtml(schema: CollectionSchemaConfig): string {
    return `<div data-type="collection-schema" data-workflow-id="${schema.workflow_id}">
<pre><code>${JSON.stringify(schema, null, 2)}</code></pre>
</div>`;
  }

  private parseSchemaFromComment(comment: PlaneComment): CollectionSchemaConfig {
    const match = comment.comment_html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/);
    if (match) {
      return JSON.parse(match[1]);
    }
    return { workflow_id: '', kinds: {} };
  }

  private nodeResultToCommentHtml(nodeId: string, result: NodeResultRecord): string {
    return `<div data-type="node-result" data-node-id="${nodeId}">
<strong>Node: ${nodeId}</strong>
<pre><code>${JSON.stringify(result, null, 2)}</code></pre>
</div>`;
  }

  private parseNodeResultFromComment(comment: PlaneComment): NodeResultRecord {
    const match = comment.comment_html.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('Invalid node result format');
  }

  private getDefaultCollectionSchema(workflowId: string): CollectionSchemaConfig {
    return {
      workflow_id: workflowId,
      kinds: {
        run_input: {
          description: 'Input for the workflow run',
          item_schema: { type: 'object' },
        },
      },
    };
  }
}