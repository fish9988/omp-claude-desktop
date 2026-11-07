import React, { useEffect, useState, useRef } from 'react';

const QUICK_CMDS = ['git status -s', 'bun --version', 'Get-ChildItem -Name'];

export const TerminalPanel = ({ cwd }: { cwd: string }) => {
  const [output, setOutput] = useState<string[]>([
    `OMP Integrated PowerShell — ${cwd}`,
    '输入命令按 Enter 执行，或点击上方快捷指令。',
  ]);
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const runCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    setRunning(true);
    setOutput((prev) => [...prev, `\nPS> ${trimmed}`]);
    setCommand('');
    try {
      const res = await fetch('/api/workspace/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd, command: trimmed }),
      });
      const data = await res.json();
      const text = [data.stdout, data.stderr].filter(Boolean).join('\n').trim();
      setOutput((prev) => [...prev, text || '(命令执行完成，无输出)']);
    } catch (e) {
      setOutput((prev) => [...prev, `Error: ${e}`]);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="omp-wb-section" style={{ flex: 1, minHeight: 0 }}>
      <div className="omp-wb-pathbar">
        <div className="omp-wb-path-crumbs" style={{ gap: 4, flexWrap: 'wrap' }}>
          {QUICK_CMDS.map((q) => (
            <button
              key={q}
              type="button"
              className="omp-wb-pill-btn"
              onClick={() => runCommand(q)}
            >
              {q}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="omp-wb-icon-btn"
          onClick={() => setOutput([`OMP Integrated PowerShell — ${cwd}`])}
          title="清空终端"
        >
          清空
        </button>
      </div>

      <div className="omp-term-console" ref={terminalRef}>
        {output.map((line, i) => (
          <pre key={i} className="omp-term-line">
            {line}
          </pre>
        ))}
        {running && <div className="omp-term-line is-running">执行中…</div>}
      </div>

      <div className="omp-term-input-row">
        <span className="omp-term-prompt">PS&gt;</span>
        <input
          className="omp-term-input"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runCommand(command)}
          placeholder="输入 PowerShell 命令并回车…"
        />
      </div>
    </div>
  );
};
