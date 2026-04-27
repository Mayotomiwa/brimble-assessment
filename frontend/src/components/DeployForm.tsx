import { useState } from 'react';
import { api } from '../api/client';

export function DeployForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [gitUrl, setGitUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gitUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const deployment = await api.createDeployment(gitUrl.trim());
      setGitUrl('');
      onCreated(deployment.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      <input
        type="text"
        placeholder="https://github.com/user/repo"
        value={gitUrl}
        onChange={e => setGitUrl(e.target.value)}
        disabled={loading}
        style={{ flex: 1, padding: '8px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #ccc' }}
      />
      <button
        type="submit"
        disabled={loading || !gitUrl.trim()}
        style={{ padding: '8px 20px', fontSize: 14, borderRadius: 4, cursor: 'pointer' }}
      >
        {loading ? 'Deploying…' : 'Deploy'}
      </button>
      {error && <span style={{ color: '#dd2222', fontSize: 13, alignSelf: 'center' }}>{error}</span>}
    </form>
  );
}
