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

// iframe-resizer communication
if (typeof window !== 'undefined' && window.parent !== window) {
  // Send height to parent iframe
  const sendHeight = () => {
    const height = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: 'resize', height }, '*');
  };

  // Listen for resize requests
  window.addEventListener('resize', sendHeight);
  window.addEventListener('load', sendHeight);
  
  // Initial height send
  setTimeout(sendHeight, 100);
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

  // Send height after render
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'resize', height }, '*');
    }
  }, [runs, loading, error]);

  if (loading) {
    return (
      <div className="runs-embed-loading" style={{ padding: '20px', textAlign: 'center' }}>
        <div className="spinner" style={{ 
          width: '24px', 
          height: '24px', 
          border: '2px solid #E4E2FF',
          borderTop: '2px solid #6351FF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 10px'
        }} />
        <span>Loading runs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="runs-embed-error" style={{ padding: '20px', color: '#EB5757' }}>
        <span style={{ marginRight: '8px' }}>⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="runs-embed-empty" style={{ padding: '20px', textAlign: 'center' }}>
        <span>No project ID provided. Add ?projectId=... to URL.</span>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="runs-embed-empty" style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ marginBottom: '16px' }}>No workflow runs yet.</p>
        <button className="btn-primary" style={{
          background: 'linear-gradient(135deg, #6351FF 0%, #5040EA 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          cursor: 'pointer'
        }}>
          Start Run
        </button>
      </div>
    );
  }

  return (
    <div className="runs-embed theme-plane" style={{ padding: '16px' }}>
      <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #D9D9D9', fontSize: '12px', color: '#8A8A8E' }}>Run</th>
            <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #D9D9D9', fontSize: '12px', color: '#8A8A8E' }}>Workflow</th>
            <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #D9D9D9', fontSize: '12px', color: '#8A8A8E' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #D9D9D9', fontSize: '12px', color: '#8A8A8E' }}>Started</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.run_id} style={{ cursor: 'pointer' }} onClick={() => {
              // Send message to parent for navigation
              if (window.parent !== window) {
                window.parent.postMessage({ type: 'run-selected', runId: run.run_id }, '*');
              }
            }}>
              <td style={{ padding: '12px', borderBottom: '1px solid #D9D9D9' }}>
                <a href={`/runs/${run.run_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#6351FF', textDecoration: 'none' }}>
                  {run.name || run.run_id.slice(0, 8)}
                </a>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #D9D9D9', color: '#3D3D40' }}>
                {run.workflow_id}
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #D9D9D9' }}>
                <span className={`badge badge-${getStatusColor(run.status)}`} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  ...getStatusBadgeStyle(run.status)
                }}>
                  {run.status}
                </span>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #D9D9D9', color: '#58585C' }}>
                {formatDate(run.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'success';
    case 'running': return 'info';
    case 'failed': return 'error';
    default: return 'warning';
  }
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'completed':
      return { background: 'rgba(39, 174, 96, 0.1)', color: '#27AE60' };
    case 'running':
      return { background: 'rgba(47, 128, 237, 0.1)', color: '#2F80ED' };
    case 'failed':
      return { background: 'rgba(235, 87, 87, 0.1)', color: '#EB5757' };
    default:
      return { background: 'rgba(242, 153, 74, 0.1)', color: '#F2994A' };
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