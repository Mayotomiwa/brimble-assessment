import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { DeployForm } from '../components/DeployForm';
import { DeploymentList } from '../components/DeploymentList';
import { LogStream } from '../components/LogStream';

export function IndexPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: deployments = [] } = useQuery({
    queryKey: ['deployments'],
    queryFn: api.listDeployments,
    refetchInterval: 3000,
  });

  function handleCreated(id: string) {
    queryClient.invalidateQueries({ queryKey: ['deployments'] });
    setSelectedId(id);
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginTop: 0, marginBottom: 24, fontSize: 24 }}>Brimble Deploy</h1>
      <DeployForm onCreated={handleCreated} />
      <DeploymentList
        deployments={deployments}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {selectedId && (
        <LogStream
          key={selectedId}
          deploymentId={selectedId}
          onTerminal={() => queryClient.invalidateQueries({ queryKey: ['deployments'] })}
        />
      )}
    </div>
  );
}
