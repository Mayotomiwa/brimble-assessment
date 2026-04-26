import type { Deployment } from '../api/client';

export function DeploymentList(_props: {
  deployments: Deployment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return null;
}
