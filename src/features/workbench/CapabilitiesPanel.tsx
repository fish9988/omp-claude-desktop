import React, { useCallback, useEffect, useState } from 'react';

interface McpServerItem {
  name: string;
  status: 'connected' | 'disabled' | 'error' | string;
  transport: string;
  command?: string;
  enabled?: boolean;
  tools?: number;
  toolsCount?: number;
  toolNames?: string[];
  latencyMs?: number;
  builtin?: boolean;
}

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
  builtinTools?: Array<{ name: string; desc: string; category?: string; tier?: 'read' | 'edit' | 'yolo' }>;
  mcpServers?: McpServerItem[];
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
  const [expandedMcp, setExpandedMcp] = useState<Record<string, boolean>>({
    'omp-local-filesystem': true,
  });
  const [addingMcp, setAddingMcp] = useState(false);
  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpTransport, setNewMcpTransport] = useState<'stdio' | 'http' | 'sse'>('stdio');
  const [newMcpCommand, setNewMcpCommand] = useState('');
  const [pingingName, setPingingName] = useState<string | null>(null);

  const loadCapabilities = useCallback(() => {
    fetch('/api/capabilities')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  const handleToggleMcp = async (srv: McpServerItem) => {
    const nextEnabled = !(srv.enabled ?? srv.status === 'connected');
    try {
      const res = await fetch(`/api/capabilities/mcp/${encodeURIComponent(srv.name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const json = await res.json();
      if (json.mcpServers) {
        setData((prev) => (prev ? { ...prev, mcpServers: json.mcpServers } : prev));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePingMcp = async (name: string) => {
    setPingingName(name);
    try {
      const res = await fetch(`/api/capabilities/mcp/${encodeURIComponent(name)}/ping`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.mcpServers) {
        setData((prev) => (prev ? { ...prev, mcpServers: json.mcpServers } : prev));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setPingingName(null), 240);
    }
  };

  const handleDeleteMcp = async (name: string) => {
    try {
      const res = await fetch(`/api/capabilities/mcp/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.mcpServers) {
        setData((prev) => (prev ? { ...prev, mcpServers: json.mcpServers } : prev));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMcp = async () => {
    if (!newMcpName.trim()) return;
    try {
      const res = await fetch('/api/capabilities/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMcpName.trim(),
          transport: newMcpTransport,
          command: newMcpCommand.trim() || 'npx -y @modelcontextprotocol/server-everything',
        }),
      });
      const json = await res.json();
      if (json.mcpServers) {
        setData((prev) => (prev ? { ...prev, mcpServers: json.mcpServers } : prev));
        setNewMcpName('');
        setNewMcpCommand('');
        setAddingMcp(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

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
          指令与工具流水线
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
          <div className="omp-wb-group-head-row">
            <span className="omp-wb-group-title" style={{ padding: 0 }}>
              MCP 扩展服务 ({mcpServers.filter((m) => m.status === 'connected').length}/{mcpServers.length} 在线)
            </span>
            <button
              type="button"
              className="omp-wb-pill-btn is-primary"
              onClick={() => setAddingMcp((v) => !v)}
            >
              {addingMcp ? '收起' : '+ 挂载 MCP'}
            </button>
          </div>

          {addingMcp && (
            <div className="omp-wb-card omp-mcp-add-form">
              <input
                type="text"
                className="omp-wb-input"
                placeholder="MCP 服务标识 (如 github-mcp)"
                value={newMcpName}
                onChange={(e) => setNewMcpName(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  className="omp-wb-input"
                  style={{ width: 92 }}
                  value={newMcpTransport}
                  onChange={(e) => setNewMcpTransport(e.target.value as any)}
                >
                  <option value="stdio">stdio</option>
                  <option value="http">http</option>
                  <option value="sse">sse</option>
                </select>
                <input
                  type="text"
                  className="omp-wb-input"
                  style={{ flex: 1 }}
                  placeholder="启动命令或端点 URL"
                  value={newMcpCommand}
                  onChange={(e) => setNewMcpCommand(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button
                  type="button"
                  className="omp-wb-pill-btn"
                  onClick={() => setAddingMcp(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="omp-wb-pill-btn is-primary"
                  onClick={handleAddMcp}
                >
                  确认挂载
                </button>
              </div>
            </div>
          )}

          {mcpServers.map((m) => {
            const isOnline = m.status === 'connected' && m.enabled !== false;
            const isExpanded = Boolean(expandedMcp[m.name]);
            const toolList = m.toolNames || [];
            return (
              <div key={m.name} className="omp-wb-card">
                <div className="omp-wb-card-head">
                  <button
                    type="button"
                    className="omp-mcp-title-btn"
                    onClick={() =>
                      setExpandedMcp((prev) => ({ ...prev, [m.name]: !prev[m.name] }))
                    }
                  >
                    <span className={`omp-status-dot ${isOnline ? 'is-on' : ''}`} />
                    <strong style={{ fontSize: 12.5 }}>{m.name}</strong>
                    <span className="omp-wb-badge">
                      {m.toolsCount ?? m.tools ?? toolList.length} tools
                    </span>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {typeof m.latencyMs === 'number' && isOnline && (
                      <span className="omp-mcp-latency">
                        {pingingName === m.name ? '测速中…' : `${m.latencyMs}ms`}
                      </span>
                    )}
                    <button
                      type="button"
                      className="omp-wb-mini-btn"
                      onClick={() => handlePingMcp(m.name)}
                      title="检测 MCP 响应延迟与工具列表"
                    >
                      Ping
                    </button>
                    <button
                      type="button"
                      className="omp-wb-mini-btn"
                      onClick={() => handleToggleMcp(m)}
                    >
                      {isOnline ? '停用' : '启用'}
                    </button>
                    {!m.builtin && (
                      <button
                        type="button"
                        className="omp-wb-mini-btn is-danger"
                        onClick={() => handleDeleteMcp(m.name)}
                      >
                        移除
                      </button>
                    )}
                  </div>
                </div>
                <div className="omp-wb-meta" style={{ fontFamily: 'var(--omp-font-code)', fontSize: 11 }}>
                  [{m.transport}] {m.command || m.name}
                </div>
                {isExpanded && toolList.length > 0 && (
                  <div className="omp-mcp-tools-wrap">
                    {toolList.map((tName) => (
                      <button
                        key={tName}
                        type="button"
                        className="omp-mcp-tool-chip"
                        onClick={() => onInsertCommand?.(`请调用 MCP 工具 ${tName} `)}
                        title="点击插入工具调用指令到输入框"
                      >
                        ⚡ {tName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="omp-wb-group-title" style={{ marginTop: 8 }}>
            已挂载模型渠道 Provider ({providers.length})
          </div>
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
            三阶段工具流水线 (Waterfall Tool Pipeline · {builtinTools.length})
          </div>
          {builtinTools.map((t) => {
            const tier = t.tier || 'read';
            const tierLabel =
              tier === 'read' ? 'Read-Only' : tier === 'edit' ? 'Accept Edits' : 'Yolo / Shell';
            return (
              <div key={t.name} className="omp-wb-card">
                <div className="omp-wb-card-head">
                  <code style={{ fontFamily: 'var(--omp-font-code)', fontSize: 12, fontWeight: 600 }}>
                    {t.name}
                  </code>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span className={`omp-tier-badge is-${tier}`}>{tierLabel}</span>
                    {t.category && <span className="omp-wb-badge">{t.category}</span>}
                  </div>
                </div>
                <div className="omp-wb-meta">{t.desc}</div>
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'config' && (
        <div className="omp-wb-preview" style={{ flex: 1 }}>
          <div className="omp-wb-preview-head">
            <span className="omp-wb-preview-path">~/.omp/agent/models.yml</span>
          </div>
          <pre className="omp-wb-code" style={{ maxHeight: 'none', flex: 1 }}>
            {rawModels}
          </pre>
        </div>
      )}
    </div>
  );
};
