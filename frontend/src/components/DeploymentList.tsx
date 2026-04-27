import { useState } from 'react';
import type { Deployment } from '../api/client';
import { StatusBadge } from './StatusBadge';

const ACTIVE = new Set(['pending', 'building', 'deploying']);

export function DeploymentList({
  deployments,
  selectedId,
  onSelect,
  onRedeploy,
  onDelete,
}: {
  deployments: Deployment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRedeploy: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function handleRedeploy(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setBusy(`redeploy-${id}`);
    try { await onRedeploy(id); } catch (err: any) { alert(err.message); }
    finally { setBusy(null); }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this deployment? The container will be stopped.')) return;
    setBusy(`delete-${id}`);
    try { await onDelete(id); } catch (err: any) { alert(err.message); }
    finally { setBusy(null); }
  }

  if (deployments.length === 0) {
    return <p style={{ color: '#888', marginTop: 16 }}>No deployments yet.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 14 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
          <th style={{ padding: '8px 12px' }}>Source</th>
          <th style={{ padding: '8px 12px' }}>Status</th>
          <th style={{ padding: '8px 12px' }}>URL</th>
          <th style={{ padding: '8px 12px' }}>Created</th>
          <th style={{ padding: '8px 12px' }} />
        </tr>
      </thead>
      <tbody>
        {deployments.map(d => {
          const isActive = ACTIVE.has(d.status);
          return (
            <tr
              key={d.id}
              onClick={() => onSelect(d.id)}
              style={{
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
                background: d.id === selectedId ? '#f5f8ff' : 'transparent',
              }}
            >
              <td style={{ padding: '10px 12px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.gitUrl ?? 'tarball'}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <StatusBadge status={d.status} />
              </td>
              <td style={{ padding: '10px 12px' }}>
                {d.liveUrl
                  ? <a href={d.liveUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{d.liveUrl}</a>
                  : '—'}
              </td>
              <td style={{ padding: '10px 12px', color: '#888', fontSize: 12 }}>
                {new Date(d.createdAt).toLocaleString()}
              </td>
              <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', display: 'flex', gap: 6 }}>
                <button
                  onClick={e => { e.stopPropagation(); onSelect(d.id); }}
                  style={{ fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}
                >
                  Logs
                </button>
                <button
                  onClick={e => handleRedeploy(e, d.id)}
                  disabled={isActive || busy === `redeploy-${d.id}`}
                  style={{ fontSize: 12, padding: '4px 10px', cursor: isActive ? 'not-allowed' : 'pointer', opacity: isActive ? 0.5 : 1 }}
                >
                  {busy === `redeploy-${d.id}` ? '…' : 'Redeploy'}
                </button>
                <button
                  onClick={e => handleDelete(e, d.id)}
                  disabled={!!busy}
                  style={{ fontSize: 12, padding: '4px 10px', cursor: 'pointer', color: '#cc3300' }}
                >
                  {busy === `delete-${d.id}` ? '…' : 'Delete'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
