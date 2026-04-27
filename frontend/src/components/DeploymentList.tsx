import type { Deployment } from '../api/client';
import { StatusBadge } from './StatusBadge';

export function DeploymentList({
  deployments,
  selectedId,
  onSelect,
}: {
  deployments: Deployment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
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
        {deployments.map(d => (
          <tr
            key={d.id}
            onClick={() => onSelect(d.id)}
            style={{
              cursor: 'pointer',
              borderBottom: '1px solid #f0f0f0',
              background: d.id === selectedId ? '#f5f8ff' : 'transparent',
            }}
          >
            <td style={{ padding: '10px 12px', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            <td style={{ padding: '10px 12px' }}>
              <button
                onClick={e => { e.stopPropagation(); onSelect(d.id); }}
                style={{ fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}
              >
                Logs
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
