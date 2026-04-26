export function openLogStream(
  deploymentId: string,
  onLine: (line: string, phase: string) => void,
  onDone: () => void,
): () => void {
  const url = `/api/deployments/${deploymentId}/logs`;
  const es = new EventSource(url);

  es.addEventListener('log', (e: MessageEvent) => {
    const { line, phase } = JSON.parse(e.data);
    onLine(line, phase);
  });

  es.addEventListener('done', () => {
    onDone();
    es.close();
  });

  es.onerror = () => {
    // EventSource auto-reconnects and sends Last-Event-ID automatically
  };

  return () => es.close();
}
