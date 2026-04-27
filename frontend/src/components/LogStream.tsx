import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { openLogStream } from '../api/sse';

export function LogStream({
  deploymentId,
  onTerminal,
}: {
  deploymentId: string;
  onTerminal: () => void;
}) {
  const [logs, setLogs] = useState('');
  const [done, setDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  function appendLine(line: string) {
    setLogs(prev => prev + line + '\n');
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    });
  }

  useEffect(() => {
    const cleanup = openLogStream(
      deploymentId,
      appendLine,
      () => {
        setDone(true);
        queryClient.invalidateQueries({ queryKey: ['deployments'] });
        onTerminal();
      },
    );
    return cleanup;
  }, [deploymentId]);

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>Build logs</strong>
        {done && <span style={{ fontSize: 12, color: '#888' }}>Stream closed</span>}
      </div>
      <textarea
        ref={textareaRef}
        value={logs}
        readOnly
        style={{
          width: '100%',
          height: 400,
          fontFamily: 'monospace',
          fontSize: 12,
          backgroundColor: '#1a1a1a',
          color: '#e0e0e0',
          border: 'none',
          borderRadius: 4,
          padding: 12,
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
