import React, { useEffect, useState } from 'react';

interface CapabilitiesData {
  ompDir?: string;
  ompAgentDir?: string;
  modelsYmlPath?: string;
  configYmlPath?: string;
  providers?: Array<{
    name: string;
    baseUrl: string;
    api: string;
    modelCount: number;
  }>;
  slashCommands?: Array<{ cmd?: string; command?: string; label?: string; desc: string }>;
  builtinTools?: Array<{ name: string; desc: string; category?: string; enabled?: boolean }>;
  mcpServers?: Array<{ name: string; status: string; transport: string; tools?: number; toolsCount?: number }>;
  modelsYml?: string;
  modelsYmlRaw?: string;
  configYml?: string;
  configYmlRaw?: string;
}

const DEFAULT_PROVIDERS = [
  { name: 'anthropic', api: 'anthropic-messages', baseUrl: 'https://api.anthropic.com', modelCount: 2 },
  { name: 'deepseek', api: 'openai-completions', baseUrl: 'https://api.deepseek.com', modelCount: 2 },
  { name: 'CPA gemini', api: 'openai-completions', baseUrl: '~/.omp/agent/models.yml', modelCount: 5 },
  { name: 'CPA OAI', api: 'openai-completions', baseUrl: '~/.omp/agent/models.yml', modelCount: 4 },
  { name: 'antigravitytool', api: 'openai-completions', baseUrl: '~/.omp/agent/models.yml', modelCount: 3 },
];

export const CapabilitiesPanel = ({
  onInsertCommand,
}: {
  onInsertCommand?: (cmd: string) => void;
}) => {
  const [data, setData] = useState<CapabilitiesData | null>(null);
  const [subTab, setSubTab] = useState<'overview' | 'commands' | 'config'>('overview');

  useEffect(() => {
    fetch('/api/capabilities')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) {
    return <div className="omp-wb-empty">正在读取 ~/.omp/agent 能力配置…</div>;
  }

  const providers = data.providers && data.providers.length > 0 ? data.providers : DEFAULT_PROVIDERS;
  const mcpServers = data.mcpServers || [];
  const slashCommands = data.slashCommands || [];
  const builtinTools = data.builtinTools || [];
  const rawModels = data.modelsYml || data.modelsYmlRaw || '# ~/.omp/agent/models.yml';

  return (
    <div className="omp-wb-section">
      <div className="omp-wb-subtabs">
        <button
          type="button"
          className={`omp-wb-subtab ${subTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setSubTab('overview')}
        >
          Provider & MCP
        </button>
        <button
          type="button"
          className={`omp-wb-subtab ${subTab === 'commands' ? 'is-active' : ''}`}
          onClick={() => setSubTab('commands')}
        >
          指令与工具
        </button>
        <button
          type="button"
          className={`omp-wb-subtab ${subTab === 'config' ? 'is-active' : ''}`}
          onClick={() => setSubTab('config')}
        >
          models.yml
        </button>
      </div>

      {subTab === 'overview' && (
        <div className="omp-wb-list">
          <div className="omp-wb-group-title">已挂载 Provider ({providers.length})</div>
          {providers.map((p) => (
            <div key={p.name} className="omp-wb-card">
              <div className="omp-wb-card-head">
                <strong style={{ fontSize: 12.5 }}>{p.name}</strong>
                <span className="omp-wb-badge">{p.modelCount} 模型</span>
              </div>
              <div className="omp-wb-meta" style={{ wordBreak: 'break-all' }}>
                {p.api} · {p.baseUrl}
              </div>
            </div>
          ))}

          <div className="omp-wb-group-title" style={{ marginTop: 6 }}>
            MCP & Agent 扩展服务 ({mcpServers.length})
          </div>
          {mcpServers.map((m) => (
            <div key={m.name} className="omp-wb-card">
              <div className="omp-wb-card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="omp-status-dot is-on" />
                  <strong style={{ fontSize: 12.5 }}>{m.name}</strong>
                </div>
                <span className="omp-wb-badge">{m.tools ?? m.toolsCount ?? 4} tools</span>
              </div>
              <div className="omp-wb-meta">
                状态: {m.status} · 传输: {m.transport}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'commands' && (
        <div className="omp-wb-list">
          <div className="omp-wb-group-title">快捷斜杠指令 (点击填入输入框)</div>
          {slashCommands.map((c) => {
            const cmdText = c.cmd || c.command || '/help';
            return (
              <div
                key={cmdText}
                className="omp-wb-card is-clickable"
                onClick={() => onInsertCommand?.(cmdText + ' ')}
              >
                <div className="omp-wb-card-head">
                  <code className="omp-popover-cmd">{cmdText}</code>
                </div>
                <div className="omp-wb-meta">{c.desc}</div>
              </div>
            );
          })}

          <div className="omp-wb-group-title" style={{ marginTop: 6 }}>
            OMP 内置 Agent 工具 ({builtinTools.length})
          </div>
          {builtinTools.map((t) => (
            <div key={t.name} className="omp-wb-card">
              <div className="omp-wb-card-head">
                <code style={{ fontFamily: 'var(--omp-font-code)', fontSize: 12 }}>{t.name}</code>
                <span className="omp-wb-badge">{t.category || 'Active'}</span>
              </div>
              <div className="omp-wb-meta">{t.desc}</div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'config' && (
        <div className="omp-wb-preview-card">
          <div className="omp-wb-preview-head">
            <span className="omp-wb-preview-title">
              {data.modelsYmlPath || `${data.ompAgentDir || '~/.omp/agent'}/models.yml`}
            </span>
          </div>
          <pre className="omp-wb-code-preview">{rawModels}</pre>
        </div>
      )}
    </div>
  );
};
