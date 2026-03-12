/**
 * Embeddable Workflow Editor for Plane Integration
 * 
 * Displays a workflow editor for a specific workflow,
 * designed to be embedded in a Plane issue view.
 */

import React from 'react';
import { useSearchParams, useParams } from 'react-router-dom';

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface Workflow {
  workflow_id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
}

interface WorkflowEditorEmbedProps {
  workflowId?: string;
  apiUrl?: string;
}

export function WorkflowEditorEmbed({ workflowId: propWorkflowId, apiUrl = '/api' }: WorkflowEditorEmbedProps) {
  const { workflowId: paramWorkflowId } = useParams();
  const [searchParams] = useSearchParams();
  const workflowId = propWorkflowId || paramWorkflowId || searchParams.get('workflowId') || '';
  
  const [workflow, setWorkflow] = React.useState<Workflow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!workflowId) {
      setLoading(false);
      return;
    }

    const fetchWorkflow = async () => {
      try {
        const response = await fetch(`${apiUrl}/workflows/${workflowId}`);
        if (!response.ok) throw new Error('Failed to fetch workflow');
        const data = await response.json();
        setWorkflow(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflow();
  }, [workflowId, apiUrl]);

  if (loading) {
    return (
      <div className="workflow-editor-loading">
        <div className="spinner" />
        <span>Loading workflow...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workflow-editor-error">
        <span className="error-icon">⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  if (!workflowId) {
    return (
      <div className="workflow-editor-empty">
        <span>No workflow ID provided. Add ?workflowId=... to URL.</span>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="workflow-editor-empty">
        <span>Workflow not found.</span>
      </div>
    );
  }

  return (
    <div className="workflow-editor-embed">
      <header className="workflow-header">
        <h1>{workflow.name}</h1>
        {workflow.description && <p>{workflow.description}</p>}
      </header>

      <div className="workflow-canvas">
        <div className="nodes-container">
          {workflow.nodes.map((node, index) => (
            <div
              key={node.id}
              className={`node node-${node.status} ${selectedNode === node.id ? 'selected' : ''}`}
              onClick={() => setSelectedNode(node.id)}
            >
              <div className="node-header">
                <span className="node-type">{node.type}</span>
                <span className={`node-status badge badge-${getStatusColor(node.status)}`}>
                  {node.status}
                </span>
              </div>
              <div className="node-name">{node.name}</div>
              {index < workflow.nodes.length - 1 && (
                <div className="node-connector" />
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedNode && (
        <div className="node-detail-panel">
          <h3>{workflow.nodes.find(n => n.id === selectedNode)?.name}</h3>
          <div className="node-actions">
            <button className="btn-secondary">View Output</button>
            <button className="btn-primary">Run Node</button>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'success';
    case 'running':
      return 'info';
    case 'failed':
      return 'error';
    default:
      return 'warning';
  }
}

export default WorkflowEditorEmbed;