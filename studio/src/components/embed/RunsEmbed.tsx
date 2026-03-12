/**
 * Embeddable Runs View for Plane Integration
 * 
 * Displays workflow runs for a project, designed to be
 * embedded in a Plane project sidebar or custom view.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';

interface Run {
  run_id: string;
  name: string;
  workflow_id: string;
  status: 'running' | 'completed' | 'failed';
  created_at: string;
}

interface RunsEmbedProps {
  projectId?: string;
  apiUrl?: string;
}

export function RunsEmbed({ projectId: propProjectId, apiUrl = '/api' }: RunsEmbedProps) {
  const [searchParams] = useSearchParams();
  const projectId = propProjectId || searchParams.get('projectId') || '';
  const [runs, setRuns] = React.useState<Run[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    // Fetch runs from API
    const fetchRuns = async () => {
      try {
        const response = await fetch(`${apiUrl}/runs?projectId=${projectId}`);
        if (!response.ok) throw new Error('Failed to fetch runs');
        const data = await response.json();
        setRuns(data.runs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, [projectId, apiUrl]);

  if (loading) {
    return (
      <div className="runs-embed-loading">
        <div className="spinner" />
        <span>Loading runs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="runs-embed-error">
        <span className="error-icon">⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="runs-embed-empty">
        <span>No project ID provided. Add ?projectId=... to URL.</span>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="runs-embed-empty">
        <span>No workflow runs yet.</span>
        <button className="btn-primary">Start Run</button>
      </div>
    );
  }

  return (
    <div className="runs-embed">
      <table className="table">
        <thead>
          <tr>
            <th>Run</th>
            <th>Workflow</th>
            <th>Status</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.run_id}>
              <td>
                <a href={`/runs/${run.run_id}`} target="_blank" rel="noopener noreferrer">
                  {run.name || run.run_id.slice(0, 8)}
                </a>
              </td>
              <td>{run.workflow_id}</td>
              <td>
                <span className={`badge badge-${getStatusColor(run.status)}`}>
                  {run.status}
                </span>
              </td>
              <td>{formatDate(run.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default RunsEmbed;