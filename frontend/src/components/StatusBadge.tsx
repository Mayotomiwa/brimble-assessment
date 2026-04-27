import type { DeploymentStatus } from '../api/client';

const COLORS: Record<DeploymentStatus, string> = {
  pending:   '#888888',
  building:  '#f0ad00',
  deploying: '#0080ff',
  running:   '#00aa44',
  failed:    '#dd2222',
};

export function StatusBadge({ status }: { status: DeploymentStatus }) {
  return (
    <span style={{
      color: COLORS[status],
      fontWeight: 600,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {status}
    </span>
  );
}
