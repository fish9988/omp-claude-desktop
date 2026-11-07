import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkbenchTabId } from '../workbench/WorkbenchDrawer';

export interface CommandPaletteSessionHit {
  id: string;
  title: string;
  workspaceName: string;
  updatedAt: number;
  snippet?: string;
}

export interface CommandPaletteProps {
  open: boolean;
  activeWorkspaceCwd: string;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onOpenWorkbench: (tab: WorkbenchTabId) => void;
  onInsertText: (text: string) => void;
  onRunSlash: (cmd: string) => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  activeWorkspaceCwd,
  onClose,
  onSelectSession,
  onNewSession,
  onOpenWorkbench,
  onInsertText,
  onRunSlash,
  onToggleTheme,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState('');
  const [sessionHits, setSessionHits] = useState<CommandPaletteSessionHit[]>([]);
  const [fileHits, setFileHits] = useState<Array<{ relPath: string; name: string }>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      try {
        const [sRes, fRes] = await Promise.all([
          fetch(`/api/sessions/search?q=${encodeURIComponent(query)}`),
          fetch(
            `/api/workspace/search-files?cwd=${encodeURIComponent(activeWorkspaceCwd)}&q=${encodeURIComponent(query)}`
          ),
        ]);
        const sData = await sRes.json();
        const fData = await fRes.json();
        setSessionHits(Array.isArray(sData.results) ? sData.results.slice(0, 6) : []);
        setFileHits(Array.isArray(fData.files) ? fData.files.slice(0, 5) : []);
      } catch (e) {
        console.error(e);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [open, query, activeWorkspaceCwd]);

  const quickActions = useMemo(() => {
    const all = [
      {
        id: 'act-new',
        label: '新建对话 (New Session)',
        hint: 'Ctrl+N',
        run: () => {
          onNewSession();
          onClose();
        },
      },
      {
        id: 'act-files',
        label: '打开项目文件树与 Markdown/代码预览',
        hint: '/files',
        run: () => {
          onOpenWorkbench('files');
          onClose();
        },
      },
      {
        id: 'act-git',
        label: '打开 Git 变更审查与彩色 Diff 面板',
        hint: '/git',
        run: () => {
          onOpenWorkbench('git');
          onClose();
        },
      },
      {
        id: 'act-caps',
        label: '打开 MCP 扩展服务与三阶段工具流水线面板',
        hint: '/capabilities',
        run: () => {
          onOpenWorkbench('caps');
          onClose();
        },
      },
      {
        id: 'act-term',
        label: '打开工作区内置 PowerShell 终端',
        hint: '/terminal',
        run: () => {
          onOpenWorkbench('term');
          onClose();
        },
      },
      {
        id: 'act-compact',
        label: '智能压缩当前会话历史上下文 (/compact)',
        hint: '释放 65% 窗口',
        run: () => {
          onRunSlash('/compact');
          onClose();
        },
      },
      {
        id: 'act-theme',
        label: '切换浅色 / 深色外观模式 (Light / Dark)',
        hint: 'Theme',
        run: () => {
          onToggleTheme();
          onClose();
        },
      },
      {
        id: 'act-settings',
        label: '打开 Claude Style 品牌、吉祥物与字体设置',
        hint: 'Settings',
        run: () => {
          onOpenSettings();
          onClose();
        },
      },
    ];
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 5);
    return all.filter(
      (a) => a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q)
    );
  }, [query, onNewSession, onOpenWorkbench, onRunSlash, onToggleTheme, onOpenSettings, onClose]);

  if (!open) return null;

  return (
    <div className="omp-cmdk-backdrop" onClick={onClose}>
      <div
        className="dsh-claude-popover-card omp-cmdk-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="omp-cmdk-header">
          <svg
            viewBox="0 0 16 16"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="7" cy="7" r="4.6" />
            <path d="M10.5 10.5L13.8 13.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="omp-cmdk-input"
            placeholder="搜索会话全文、工作台动作、MCP 工具或 @工作区文件… (Esc 关闭)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          <kbd className="omp-cmdk-kbd">ESC</kbd>
        </div>

        <div className="omp-cmdk-body">
          {quickActions.length > 0 && (
            <div className="omp-cmdk-section">
              <div className="omp-cmdk-section-title">快捷动作与工作台 (Quick Actions)</div>
              {quickActions.map((act, idx) => (
                <button
                  key={act.id}
                  type="button"
                  className={`omp-cmdk-item ${selectedIndex === idx ? 'is-selected' : ''}`}
                  onClick={act.run}
                >
                  <span className="omp-cmdk-item-label">{act.label}</span>
                  <code className="omp-cmdk-item-hint">{act.hint}</code>
                </button>
              ))}
            </div>
          )}

          {sessionHits.length > 0 && (
            <div className="omp-cmdk-section">
              <div className="omp-cmdk-section-title">
                会话全文检索 ({sessionHits.length})
              </div>
              {sessionHits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  className="omp-cmdk-item is-session"
                  onClick={() => {
                    onSelectSession(hit.id);
                    onClose();
                  }}
                >
                  <div className="omp-cmdk-session-top">
                    <span className="omp-cmdk-item-label">{hit.title}</span>
                    <span className="omp-cmdk-item-ws">{hit.workspaceName}</span>
                  </div>
                  {hit.snippet && <div className="omp-cmdk-session-snippet">{hit.snippet}</div>}
                </button>
              ))}
            </div>
          )}

          {fileHits.length > 0 && (
            <div className="omp-cmdk-section">
              <div className="omp-cmdk-section-title">
                引用工作区文件 (@ File Reference)
              </div>
              {fileHits.map((f) => (
                <button
                  key={f.relPath}
                  type="button"
                  className="omp-cmdk-item"
                  onClick={() => {
                    onInsertText(`@${f.relPath}`);
                    onClose();
                  }}
                >
                  <code className="omp-popover-cmd">@{f.relPath}</code>
                  <span className="omp-cmdk-item-hint">插入到输入框</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
