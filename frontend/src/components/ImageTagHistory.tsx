import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function ImageTagHistory({ deploymentId }: { deploymentId: string }) {
  const queryClient = useQueryClient();
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags', deploymentId],
    queryFn: () => api.getImageTags(deploymentId),
  });

  async function handleRollback(tagId: string) {
    try {
      await api.rollback(deploymentId, tagId);
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    }
  }

  if (isLoading) return null;
  if (tags.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <strong style={{ fontSize: 13 }}>Image tags</strong>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 12, fontFamily: 'monospace' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
            <th style={{ padding: '4px 8px', fontWeight: 600 }}>Tag</th>
            <th style={{ padding: '4px 8px', fontWeight: 600 }}>Built</th>
            <th style={{ padding: '4px 8px' }} />
          </tr>
        </thead>
        <tbody>
          {tags.map(tag => (
            <tr key={tag.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <td style={{ padding: '4px 8px', color: '#555' }}>{tag.tag}</td>
              <td style={{ padding: '4px 8px', color: '#888' }}>{new Date(tag.createdAt).toLocaleString()}</td>
              <td style={{ padding: '4px 8px' }}>
                <button
                  onClick={() => handleRollback(tag.id)}
                  style={{ fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}
                >
                  Rollback
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
