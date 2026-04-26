// In-memory pub/sub for live log broadcast — implemented per phase
export const sseBroker = {
  subscribe(_deploymentId: string, _res: unknown): () => void {
    return () => {};
  },
  broadcast(_deploymentId: string, _event: { id?: string; line: string; phase: string }): void {},
  close(_deploymentId: string): void {},
};
