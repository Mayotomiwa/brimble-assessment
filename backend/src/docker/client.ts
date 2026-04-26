// dockerode wrapper: run/inspect/stop — implemented per phase
export const dockerClient = {
  async runContainer(_registryRef: string): Promise<string> {
    return '';
  },
  async getHostPort(_containerId: string): Promise<number> {
    return 0;
  },
  async healthCheck(_containerId: string, _hostPort: number): Promise<void> {},
  async stopContainer(_containerId: string): Promise<void> {},
};
