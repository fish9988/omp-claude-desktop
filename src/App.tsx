import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppSettings,
  BootstrapPayload,
  PermissionMode,
  SessionStatsData,
  SessionSummary,
  ThinkingLevel,
  TurnItem,
} from './types';
import { Mascot } from './features/mascot/Mascot';
import { ContextMeter, formatCompactTokens } from './features/context/ContextMeter';
import { EffortPicker } from './features/effort/EffortPicker';
import { ModelPicker } from './features/model/ModelPicker';
import { HomeDashboard } from './features/home/HomeDashboard';
import { ConversationView } from './features/chat/ConversationView';
import { SettingsDialog } from './features/settings/SettingsDialog';
import { WorkbenchDrawer, type WorkbenchTabId } from './features/workbench/WorkbenchDrawer';
import { CommandPalette } from './features/command/CommandPalette';
import './features/command/cmdk.css';

const DEFAULT_SETTINGS: AppSettings = {
  brand: 'claude',
  palette: 'claude',
  scheme: 'light',
  homeLayout: 'studio',
  mascot: 'crab',
  mascotScope: 'all',
  processLayout: 'column',
  effortAccent: true,
  billingCurrency: 'CNY',
  reducedMotion: false,
  waitAnimation: 'sweep',
  uiFont: 'Anthropic Sans',
  serifFont: 'Anthropic Serif',
  codeFont: 'Anthropic Mono',
  chatWidth: 720,
  openPopoversOnHover: true,
  customSeeds: {
    accent: '#d97757',
    canvasLight: '#ffffff',
    canvasDark: '#191919',
    sidebarLight: '#fafafa',
    sidebarDark: '#1f1f1f',
    bubbleLight: '#f4f2f3',
    bubbleDark: '#262626',
  },
  customPrices: {},
};

const EMPTY_STATS: SessionStatsData = {
  turns: 0,
  steps: 0,
  llmMs: 0,
  toolMs: 0,
  ttftMs: 0,
  ttftSteps: 0,
  decodeTokens: 0,
  decodeMs: 0,
  uncachedInputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 0,
  promptTokens: 0,
  contextWindow: 1_000_000,
  costMicroCny: 0,
  costMicroUsd: 0,
};

interface CachedSessionView {
  sessionId: string;
  title: string;
  cwd: string;
  workspaceName: string;
  model: string;
  provider: string;
  thinkingLevel: ThinkingLevel;
  turns: TurnItem[];
  hasMore: boolean;
  nextCursor: number | null;
  sessionStats: SessionStatsData;
}

function formatRelativeTime(updatedAt?: number, fallbackIdx = 0): string {
  if (!updatedAt) {
    return ['20分钟', '1小时', '2小时', '1天'][fallbackIdx % 4];
  }
  const diffMin = Math.max(1, Math.round((Date.now() - updatedAt) / 60000));
  if (diffMin < 60) return `${diffMin}分钟`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}小时`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}天`;
}

export default function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('omp-claude-settings-v1');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'trace'>('chat');
  const [editingHeaderTitle, setEditingHeaderTitle] = useState(false);
  const [draftHeaderTitle, setDraftHeaderTitle] = useState('');
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTabId | null>(null);
  const [queuedPrompts, setQueuedPrompts] = useState<
    Record<string, Array<{ text: string; model?: string; thinkingLevel?: string }>>
  >({});

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeWorkspaceCwd, setActiveWorkspaceCwd] = useState<string>(
    'C:\\DSH_work\\插件开发\\omp-claude-desktop'
  );
  const [collapsedWorkspaces, setCollapsedWorkspaces] = useState<Record<string, boolean>>({});

  const [sessionViews, setSessionViews] = useState<Record<string, CachedSessionView>>({});
  const [keepAliveIds, setKeepAliveIds] = useState<string[]>([]);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [draftText, setDraftText] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-opus-4-6');
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('high');
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('edit');
  const [btwBanner, setBtwBanner] = useState<{ question: string; answer: string } | null>(null);
  const [attachments, setAttachments] = useState<
    Array<{ id: string; label: string; content: string; lines: number }>
  >([]);
  const [atFiles, setAtFiles] = useState<string[]>([]);
  const [sessionMenu, setSessionMenu] = useState<{
    sessionId: string;
    title: string;
    pinned?: boolean;
    x: number;
    y: number;
  } | null>(null);

  const SLASH_COMMANDS = useMemo(
    () => [
      { name: '/compact', desc: '压缩当前会话历史上下文，释放 Token 窗口' },
      { name: '/btw ', desc: '旁路快问（独立浮层回答，不污染主会话历史）' },
      { name: '/export', desc: '将当前完整会话导出为 Markdown 文档' },
      { name: '/fork', desc: '从当前轮次创建分支会话 (Session Tree Fork)' },
      { name: '/files', desc: '打开右侧项目文件树与代码预览面板' },
      { name: '/git', desc: '打开右侧 Git 变更审查与暂存提交面板' },
      { name: '/terminal', desc: '打开右侧工作区内置 PowerShell 终端' },
      { name: '/schedules', desc: '打开右侧定时任务调度器 (Cron Schedules)' },
      { name: '/capabilities', desc: '查看 OMP Provider、Slash 命令与内置工具' },
      { name: '/theme', desc: '打开 Claude Style 外观与字体微调设置' },
      { name: '/clear', desc: '清空当前草稿与附件或切换到新对话' },
    ],
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qScheme = params.get('scheme');
    const qPalette = params.get('palette');
    const qLayout = params.get('layout');
    const qMascot = params.get('mascot');
    const qSession = params.get('session');

    if (qScheme === 'dark' || qScheme === 'light') {
      setSettings((prev) => ({ ...prev, scheme: qScheme }));
    }
    if (qPalette === 'claude' || qPalette === 'deepseek') {
      setSettings((prev) => ({
        ...prev,
        brand: qPalette,
        palette: qPalette,
        mascot: qPalette === 'deepseek' ? 'deepy' : 'crab',
      }));
    }
    if (qLayout === 'studio' || qLayout === 'classic') {
      setSettings((prev) => ({ ...prev, homeLayout: qLayout }));
    }
    if (qMascot === 'crab' || qMascot === 'deepy' || qMascot === 'whalegirl') {
      setSettings((prev) => ({ ...prev, mascot: qMascot }));
    }
    if (qSession) {
      loadAndActivateSession(qSession);
    }
    if (params.get('settings') === '1') {
      setSettingsOpen(true);
    }
    if (params.get('cmdk') === '1') {
      setCmdPaletteOpen(true);
    }
    const qWb = params.get('workbench');
    if (qWb === 'files' || qWb === 'git' || qWb === 'term' || qWb === 'sched' || qWb === 'caps') {
      setWorkbenchTab(qWb);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const atMatch = useMemo(() => {
    const m = draftText.match(/(?:^|\s)@([^\s]*)$/);
    return m ? m[1] : null;
  }, [draftText]);

  useEffect(() => {
    if (atMatch === null) {
      setAtFiles([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/workspace/search-files?cwd=${encodeURIComponent(activeWorkspaceCwd)}&q=${encodeURIComponent(atMatch)}`
        );
        const data = await res.json();
        setAtFiles(Array.isArray(data.files) ? data.files.slice(0, 8) : []);
      } catch {
        setAtFiles([]);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [atMatch, activeWorkspaceCwd]);

  const matchingSlashCommands = useMemo(() => {
    if (!draftText.startsWith('/') || draftText.includes('\n')) return [];
    const token = draftText.split(' ')[0].toLowerCase();
    if (draftText.includes(' ') && token !== '/btw') return [];
    return SLASH_COMMANDS.filter((c) => c.name.toLowerCase().startsWith(token));
  }, [draftText, SLASH_COMMANDS]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('omp-claude-settings-v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const isDark = useMemo(() => {
    if (settings.scheme === 'dark') return true;
    if (settings.scheme === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }, [settings.scheme]);

  useEffect(() => {
    const b = document.body;
    const docEl = document.documentElement;
    b.setAttribute('data-dsh-claude-style', '1.0.0');
    b.setAttribute('data-dsh-claude-palette', 'claude');
    b.setAttribute(
      'data-dsh-claude-palette-card',
      settings.palette === 'deepseek' ? 'deepseek' : 'claude'
    );
    b.setAttribute('data-dsh-claude-brand', settings.brand);
    b.setAttribute('data-dsh-claude-scheme', isDark ? 'dark' : 'light');
    if (isDark) {
      b.setAttribute('data-ds-dark-theme', '');
      docEl.setAttribute('data-ds-dark-theme', '');
    } else {
      b.removeAttribute('data-ds-dark-theme');
      docEl.removeAttribute('data-ds-dark-theme');
    }
    b.setAttribute('data-dsh-claude-home-layout', settings.homeLayout);
    b.setAttribute('data-dsh-claude-process-layout', settings.processLayout);
    if (settings.effortAccent) b.setAttribute('data-dsh-claude-effort-accent', 'true');
    else b.removeAttribute('data-dsh-claude-effort-accent');

    const root = document.documentElement;
    root.style.setProperty('--omp-font-ui', `'${settings.uiFont}', 'Inter', 'Microsoft YaHei UI', sans-serif`);
    root.style.setProperty('--omp-font-serif', `'${settings.serifFont}', 'Noto Serif', Georgia, serif`);
    root.style.setProperty('--omp-font-code', `'${settings.codeFont}', 'JetBrains Mono', Consolas, monospace`);

    if (settings.palette === 'custom') {
      root.style.setProperty('--omp-accent', settings.customSeeds.accent);
      root.style.setProperty(
        '--omp-canvas',
        isDark ? settings.customSeeds.canvasDark : settings.customSeeds.canvasLight
      );
      root.style.setProperty(
        '--omp-sidebar',
        isDark ? settings.customSeeds.sidebarDark : settings.customSeeds.sidebarLight
      );
      root.style.setProperty(
        '--omp-bubble',
        isDark ? settings.customSeeds.bubbleDark : settings.customSeeds.bubbleLight
      );
    } else {
      root.style.removeProperty('--omp-accent');
      root.style.removeProperty('--omp-canvas');
      root.style.removeProperty('--omp-sidebar');
      root.style.removeProperty('--omp-bubble');
    }

    (window as any).ompDesktop?.updateWindowOverlay?.({ isDark });
  }, [settings, isDark]);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      const data: BootstrapPayload = await res.json();
      setBootstrap(data);
    } catch (e) {
      console.error('Bootstrap error:', e);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  const fetchSessionTail = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/tail?limit=50`);
      if (!res.ok) return null;
      const data: CachedSessionView = await res.json();
      setSessionViews((prev) => ({ ...prev, [sessionId]: data }));
      return data;
    } catch {
      return null;
    }
  }, []);

  const loadAndActivateSession = useCallback(
    async (sessionId: string) => {
      setActiveSessionId(sessionId);
      setKeepAliveIds((prev) => {
        const filtered = prev.filter((id) => id !== sessionId);
        return [sessionId, ...filtered].slice(0, 3);
      });
      if (!sessionViews[sessionId]) {
        const loaded = await fetchSessionTail(sessionId);
        if (loaded) {
          setSelectedModel(loaded.model || 'claude-opus-4-6');
          setThinkingLevel((loaded.thinkingLevel as ThinkingLevel) || 'high');
        }
      } else {
        const cached = sessionViews[sessionId];
        setSelectedModel(cached.model || 'claude-opus-4-6');
        setThinkingLevel((cached.thinkingLevel as ThinkingLevel) || 'high');
      }
    },
    [sessionViews, fetchSessionTail]
  );

  const handleSessionHoverEnter = useCallback(
    (sessionId: string) => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        fetch(`/api/sessions/${encodeURIComponent(sessionId)}/prewarm`, { method: 'POST' }).catch(
          () => {}
        );
        if (!sessionViews[sessionId]) {
          fetchSessionTail(sessionId);
        }
      }, 160);
    },
    [sessionViews, fetchSessionTail]
  );

  const handleSessionHoverLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${proto}://${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(wsUrl);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'session_status') {
            setBootstrap((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                sessions: prev.sessions.map((s) =>
                  s.id === msg.sessionId
                    ? {
                        ...s,
                        running: msg.running,
                        phase: msg.phase || 'idle',
                        title: msg.title || s.title,
                      }
                    : s
                ),
              };
            });
          } else if (msg.type === 'turn_stream') {
            setSessionViews((prev) => {
              const view = prev[msg.sessionId];
              if (!view) return prev;
              return {
                ...prev,
                [msg.sessionId]: {
                  ...view,
                  turns: view.turns.map((t) =>
                    t.id === msg.turnId
                      ? {
                          ...t,
                          processSteps: msg.processSteps || t.processSteps,
                          assistantMessage: msg.assistantMessage || t.assistantMessage,
                          waitingWord: msg.waitingWord || t.waitingWord,
                          streaming: true,
                        }
                      : t
                  ),
                },
              };
            });
          } else if (msg.type === 'turn_end') {
            setSessionViews((prev) => {
              const view = prev[msg.sessionId];
              if (!view) return prev;
              return {
                ...prev,
                [msg.sessionId]: {
                  ...view,
                  turns: view.turns.map((t) => (t.id === msg.turnId ? msg.turn : t)),
                  sessionStats: msg.sessionStats || view.sessionStats,
                },
              };
            });
          }
        } catch {}
      };
      ws.onclose = () => {
        if (!closed) setTimeout(connect, 1500);
      };
    };

    connect();
    return () => {
      closed = true;
      ws?.close();
    };
  }, []);

  const handleExportSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/export`);
      const data = await res.json();
      if (data.ok && data.markdown) {
        const blob = new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `${sessionId}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
  };

  const handleCompactSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/compact`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok) {
        setSessionViews((prev) => {
          const curr = prev[sessionId];
          if (!curr) return prev;
          return {
            ...prev,
            [sessionId]: {
              ...curr,
              turns: data.turns || curr.turns,
              sessionStats: data.sessionStats || curr.sessionStats,
            },
          };
        });
      }
    } catch {}
  };

  const handleTogglePinSession = async (sessionId: string, pinned: boolean) => {
    await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    });
    refreshBootstrap();
  };

  const handleDeleteSession = async (sessionId: string) => {
    await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
    if (activeSessionId === sessionId) setActiveSessionId(null);
    refreshBootstrap();
  };

  const handleAddWorkspacePrompt = async () => {
    const folder = window.prompt('输入要添加的本地项目目录路径:', activeWorkspaceCwd);
    if (!folder || !folder.trim()) return;
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd: folder.trim() }),
      });
      const data = await res.json();
      if (data.ok && data.workspace) {
        setActiveWorkspaceCwd(data.workspace.cwd);
        refreshBootstrap();
      }
    } catch {}
  };

  const handleSendPrompt = async (overrideText?: string) => {
    const rawText = (overrideText ?? draftText).trim();
    if (!rawText && attachments.length === 0) return;

    if (rawText === '/files') {
      setDraftText('');
      setWorkbenchTab('files');
      return;
    }
    if (rawText === '/git') {
      setDraftText('');
      setWorkbenchTab('git');
      return;
    }
    if (rawText === '/terminal') {
      setDraftText('');
      setWorkbenchTab('term');
      return;
    }
    if (rawText === '/schedules') {
      setDraftText('');
      setWorkbenchTab('sched');
      return;
    }
    if (rawText === '/capabilities') {
      setDraftText('');
      setWorkbenchTab('caps');
      return;
    }
    if (rawText === '/theme') {
      setDraftText('');
      setSettingsOpen(true);
      return;
    }
    if (rawText === '/clear') {
      setDraftText('');
      setAttachments([]);
      setActiveSessionId(null);
      return;
    }
    if (rawText === '/export' && activeSessionId) {
      setDraftText('');
      await handleExportSession(activeSessionId);
      return;
    }
    if (rawText === '/compact' && activeSessionId) {
      setDraftText('');
      await handleCompactSession(activeSessionId);
      return;
    }
    if (rawText === '/fork' && activeSessionId) {
      setDraftText('');
      const lastTurnId = activeView?.turns[activeView.turns.length - 1]?.id || '';
      await handleForkTurn(activeSessionId, lastTurnId);
      return;
    }

    const attachmentBlock =
      attachments.length > 0
        ? '\n\n' +
          attachments
            .map((a) => `<attachment title="${a.label}" lines="${a.lines}">\n${a.content}\n</attachment>`)
            .join('\n\n')
        : '';
    const text = `${rawText}${attachmentBlock}`.trim();

    if (!overrideText) {
      setDraftText('');
      setAttachments([]);
    }

    if (text.startsWith('/btw ')) {
      const q = text.slice(5).trim();
      const targetId = activeSessionId || 'session-markdown-tour';
      const res = await fetch(`/api/sessions/${encodeURIComponent(targetId)}/btw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.answer) {
        setBtwBanner({ question: q, answer: data.answer });
      }
      return;
    }

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      const createRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cwd: activeWorkspaceCwd,
          title: text.slice(0, 48),
          model: selectedModel,
          thinkingLevel,
        }),
      });
      const created = await createRes.json();
      if (created?.session?.id) {
        targetSessionId = created.session.id;
        setSessionViews((prev) => ({
          ...prev,
          [targetSessionId!]: {
            sessionId: targetSessionId!,
            title: created.session.title,
            cwd: created.session.cwd,
            workspaceName: created.session.workspaceName,
            model: created.session.model,
            provider: created.session.provider,
            thinkingLevel: created.session.thinkingLevel,
            turns: [],
            hasMore: false,
            nextCursor: null,
            sessionStats: { ...EMPTY_STATS },
          },
        }));
        setActiveSessionId(targetSessionId);
        setKeepAliveIds((prev) => [targetSessionId!, ...prev.filter((x) => x !== targetSessionId)].slice(0, 3));
        refreshBootstrap();
      }
    }

    if (!targetSessionId) return;

    const promptRes = await fetch(`/api/sessions/${encodeURIComponent(targetSessionId)}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model: selectedModel,
        thinkingLevel,
        permissionMode,
      }),
    });
    const promptData = await promptRes.json();
    if (promptData?.turn) {
      setSessionViews((prev) => {
        const view = prev[targetSessionId!];
        if (!view) return prev;
        return {
          ...prev,
          [targetSessionId!]: {
            ...view,
            turns: [...view.turns, promptData.turn],
          },
        };
      });
    } else if (promptData?.queued) {
      setQueuedPrompts((prev) => ({
        ...prev,
        [targetSessionId!]: [...(prev[targetSessionId!] || []), { text, model: selectedModel, thinkingLevel }],
      }));
    }
  };

  const handleAbortRun = async () => {
    if (!activeSessionId) return;
    await fetch(`/api/sessions/${encodeURIComponent(activeSessionId)}/abort`, { method: 'POST' });
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    setSessionViews((prev) => {
      const v = prev[sessionId];
      if (!v) return prev;
      return { ...prev, [sessionId]: { ...v, title: newTitle } };
    });
    refreshBootstrap();
  };

  const handleForkTurn = async (sessionId: string, turnId: string) => {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnId }),
    });
    const data = await res.json();
    if (data?.sessionId) {
      await refreshBootstrap();
      loadAndActivateSession(data.sessionId);
    }
  };

  const handleLoadMore = async (sessionId: string) => {
    const view = sessionViews[sessionId];
    if (!view || !view.hasMore || view.nextCursor === null) return;
    const res = await fetch(
      `/api/sessions/${encodeURIComponent(sessionId)}/page?before=${view.nextCursor}&limit=50`
    );
    const data = await res.json();
    if (Array.isArray(data.turns)) {
      setSessionViews((prev) => {
        const curr = prev[sessionId];
        if (!curr) return prev;
        return {
          ...prev,
          [sessionId]: {
            ...curr,
            turns: [...data.turns, ...curr.turns],
            hasMore: data.hasMore,
            nextCursor: data.nextCursor,
          },
        };
      });
    }
  };

  const activeView = activeSessionId ? sessionViews[activeSessionId] : null;
  const activeSummary = bootstrap?.sessions.find((s) => s.id === activeSessionId);
  const isActiveRunning = Boolean(activeSummary?.running);
  const currentPhase = activeSummary?.phase || 'idle';

  const groupedWorkspaces = useMemo(() => {
    if (!bootstrap) return [];
    const q = searchQuery.trim().toLowerCase();
    const groups = new Map<string, { name: string; cwd: string; sessions: SessionSummary[] }>();

    for (const s of bootstrap.sessions) {
      if (q && !s.title.toLowerCase().includes(q) && !s.workspaceName.toLowerCase().includes(q)) {
        continue;
      }
      const existing = groups.get(s.cwd);
      if (existing) {
        existing.sessions.push(s);
      } else {
        groups.set(s.cwd, { name: s.workspaceName, cwd: s.cwd, sessions: [s] });
      }
    }
    return Array.from(groups.values());
  }, [bootstrap, searchQuery]);

  if (!bootstrap) {
    return <div className="omp-shell" />;
  }

  const renderComposerCard = (isHome: boolean) => {
    const stats = activeView?.sessionStats || EMPTY_STATS;
    const showMascotHere =
      settings.mascot !== 'off' && (settings.mascotScope === 'all' || isHome);
    const decodeRate =
      stats.decodeMs > 0
        ? Math.round((stats.decodeTokens / stats.decodeMs) * 1000)
        : 467;
    const totalTokens =
      stats.uncachedInputTokens +
        stats.cacheReadTokens +
        stats.cacheWriteTokens +
        stats.outputTokens || 5400;
    const totalPrompt =
      stats.uncachedInputTokens + stats.cacheReadTokens + stats.cacheWriteTokens;
    const cachePct =
      totalPrompt > 0 ? Math.round((stats.cacheReadTokens / totalPrompt) * 100) : 0;

    return (
      <div className={`omp-composer-dock${isHome ? ' is-home' : ' is-chat'}`}>
        {isHome && (
          <div className="omp-workspace-pills-row">
            <label className="omp-ws-chip">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.35">
                <path d="M2 4.5A1.3 1.3 0 0 1 3.3 3.2h2.9l1.3 1.5h5.2A1.3 1.3 0 0 1 14 6v5.7a1.3 1.3 0 0 1-1.3 1.3H3.3A1.3 1.3 0 0 1 2 11.7V4.5z" />
              </svg>
              <select
                className="omp-ws-chip-select"
                value={activeWorkspaceCwd}
                onChange={(e) => setActiveWorkspaceCwd(e.target.value)}
              >
                {bootstrap.workspaces.map((w) => (
                  <option key={w.cwd} value={w.cwd}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="omp-ws-chip"
              onClick={() => setWorkbenchTab((prev) => (prev ? null : 'files'))}
              title="切换标准模式 / 打开工作台"
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.35">
                <circle cx="8" cy="8" r="2.2" />
                <path d="M8 2.2v1.6M8 12.2v1.6M2.2 8h1.6M12.2 8h1.6M3.9 3.9l1.1 1.1M11 11l1.1 1.1M3.9 12.1L5 11M11 5l1.1-1.1" strokeLinecap="round" />
              </svg>
              <span>标准模式</span>
            </button>
          </div>
        )}

        {/* Single-line rounded input pill (matches dsh-claude-style features/composer/inline.css) */}
        <div className="omp-composer-input-box">
          {showMascotHere && (
            <Mascot
              character={settings.mascot}
              place="card"
              sessionPhase={currentPhase}
              reducedMotion={settings.reducedMotion}
              balanceLabel={settings.billingCurrency === 'USD' ? 'USD 34.50' : 'CNY 248.60'}
            />
          )}

          {matchingSlashCommands.length > 0 && (
            <div className="dsh-claude-popover-card omp-floating-popover">
              <div className="omp-popover-title">OMP 斜杠指令 (Slash Commands)</div>
              {matchingSlashCommands.map((cmd) => (
                <button
                  key={cmd.name}
                  type="button"
                  className="omp-popover-item"
                  onClick={() => {
                    if (cmd.name === '/btw ') {
                      setDraftText('/btw ');
                    } else {
                      handleSendPrompt(cmd.name.trim());
                    }
                  }}
                >
                  <code className="omp-popover-cmd">{cmd.name}</code>
                  <span className="omp-popover-desc">{cmd.desc}</span>
                </button>
              ))}
            </div>
          )}

          {atFiles.length > 0 && (
            <div className="dsh-claude-popover-card omp-floating-popover">
              <div className="omp-popover-title">引用工作区文件 (@ File Reference)</div>
              {atFiles.map((fileRel) => (
                <button
                  key={fileRel}
                  type="button"
                  className="omp-popover-item"
                  onClick={() => {
                    setDraftText((prev) =>
                      prev.replace(/(?:^|\s)@([^\s]*)$/, ` @${fileRel} `).trimStart()
                    );
                    setAtFiles([]);
                  }}
                >
                  <code className="omp-popover-cmd">@{fileRel}</code>
                </button>
              ))}
            </div>
          )}

          {btwBanner && (
            <div className="omp-btw-banner">
              <div className="omp-btw-text">{btwBanner.answer}</div>
              <button type="button" className="omp-icon-btn" onClick={() => setBtwBanner(null)}>
                ✕
              </button>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="omp-attachments-row">
              {attachments.map((att) => (
                <div key={att.id} className="omp-attachment-chip">
                  <span className="omp-attachment-label">{att.label}</span>
                  <span className="omp-attachment-lines">{att.lines} 行</span>
                  <button
                    type="button"
                    className="omp-attachment-remove"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            rows={1}
            className="omp-composer-textarea"
            placeholder={isHome ? '随便问点什么' : '回复…'}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text/plain');
              const lineCount = pasted.split('\n').length;
              if (pasted.length >= 450 || lineCount >= 14) {
                e.preventDefault();
                setAttachments((prev) => [
                  ...prev,
                  {
                    id: `att-${Date.now()}`,
                    label: `粘贴片段 #${prev.length + 1}`,
                    content: pasted,
                    lines: lineCount,
                  },
                ]);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendPrompt();
              }
            }}
          />

          {/* Pinned Return ↵ or Stop ring button inside right end of input pill */}
          {isActiveRunning ? (
            <button
              type="button"
              className="omp-composer-return-btn is-stop"
              onClick={handleAbortRun}
              title="停止生成"
            >
              <span className="omp-stop-ring">
                <span className="omp-stop-square" />
              </span>
            </button>
          ) : (
            <button
              type="button"
              className={`omp-composer-return-btn${draftText.trim() ? ' is-ready' : ''}`}
              disabled={!draftText.trim() && attachments.length === 0}
              onClick={() => handleSendPrompt()}
              title="发送 (Enter)"
            >
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path
                  d="M12.5 3.5V9.5H3.5M6.5 6.5L3.5 9.5L6.5 12.5"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Canvas footer bar directly below the input pill (matches dsh-claude-style inline-bar.css) */}
        <div className="omp-composer-footer-row">
          <div className="omp-composer-left-tools">
            {isHome ? (
              <div className="dsh-claude-segments omp-perm-segments" role="group" aria-label="权限模式">
                {(['read', 'edit', 'yolo'] as PermissionMode[]).map((mode) => {
                  const active = permissionMode === mode;
                  const label = mode === 'read' ? 'Read' : mode === 'edit' ? 'Edit' : 'Yolo';
                  return (
                    <button
                      key={mode}
                      type="button"
                      className="dsh-claude-segment"
                      data-active={active ? '' : undefined}
                      aria-pressed={active}
                      onClick={() => setPermissionMode(mode)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                className="omp-mode-inline-btn"
                onClick={() =>
                  setPermissionMode((prev) =>
                    prev === 'edit' ? 'yolo' : prev === 'yolo' ? 'read' : 'edit'
                  )
                }
                title="点击切换工具权限模式 (Read / Accept edits / Yolo)"
              >
                <span>
                  {permissionMode === 'edit'
                    ? 'Accept edits'
                    : permissionMode === 'yolo'
                      ? 'Yolo'
                      : 'Read only'}
                </span>
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 4.5L6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            <div className="omp-plus-anchor">
              <button
                type="button"
                className="omp-plus-btn"
                onClick={() => setPlusMenuOpen((v) => !v)}
                title="工作台与上下文工具"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 3.2v9.6M3.2 8h9.6" strokeLinecap="round" />
                </svg>
              </button>

              {plusMenuOpen && (
                <div className="dsh-claude-popover-card omp-plus-popover">
                  <button
                    type="button"
                    className="omp-popover-item"
                    onClick={() => {
                      setWorkbenchTab('files');
                      setPlusMenuOpen(false);
                    }}
                  >
                    <span>项目文件树与预览</span>
                    <code>/files</code>
                  </button>
                  <button
                    type="button"
                    className="omp-popover-item"
                    onClick={() => {
                      setWorkbenchTab('git');
                      setPlusMenuOpen(false);
                    }}
                  >
                    <span>Git 变更审查与提交</span>
                    <code>/git</code>
                  </button>
                  <button
                    type="button"
                    className="omp-popover-item"
                    onClick={() => {
                      setWorkbenchTab('term');
                      setPlusMenuOpen(false);
                    }}
                  >
                    <span>内置 PowerShell 终端</span>
                    <code>/terminal</code>
                  </button>
                  <button
                    type="button"
                    className="omp-popover-item"
                    onClick={() => {
                      setWorkbenchTab('sched');
                      setPlusMenuOpen(false);
                    }}
                  >
                    <span>自动化定时任务</span>
                    <code>/schedules</code>
                  </button>
                  <button
                    type="button"
                    className="omp-popover-item"
                    onClick={() => {
                      setWorkbenchTab('caps');
                      setPlusMenuOpen(false);
                    }}
                  >
                    <span>OMP 模型与能力配置</span>
                    <code>/capabilities</code>
                  </button>
                </div>
              )}
            </div>
          </div>

          {!isHome && (
            <div className="dsh-claude-inline-stats">
              <span className="dsh-claude-inline-stats-item">
                {Math.max(1, stats.turns)}轮{Math.max(1, stats.steps)}步
              </span>
              <span className="dsh-claude-inline-stats-sep">·</span>
              <span className="dsh-claude-inline-stats-item">{decodeRate}tok/s</span>
              <span className="dsh-claude-inline-stats-sep">·</span>
              <span className="dsh-claude-inline-stats-item">
                {formatCompactTokens(totalTokens)} tok
              </span>
              <span className="dsh-claude-inline-stats-sep">·</span>
              <span className="dsh-claude-inline-stats-item">{cachePct}% Cache</span>
            </div>
          )}

          <div className="omp-composer-right-tools">
            <div className="dsh-claude-model-seat">
              <ModelPicker
                models={bootstrap.models}
                value={selectedModel}
                onChange={setSelectedModel}
              />
              <EffortPicker
                value={thinkingLevel}
                onChange={setThinkingLevel}
                openOnHover={settings.openPopoversOnHover}
              />
            </div>

            <ContextMeter
              stats={stats}
              currency={settings.billingCurrency}
              isDark={isDark}
              openOnHover={settings.openPopoversOnHover}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="omp-shell">
      <aside className={`omp-sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`} data-pane="sidebar">
        <div className="omp-sidebar-brand-row">
          <button
            type="button"
            className={`omp-sidebar-logo is-${settings.brand}`}
            onClick={() => setActiveSessionId(null)}
            title="返回 Studio 首页"
          >
            {settings.brand === 'claude' ? (
              <>
                <span
                  className="dsh-claude-masked-mark omp-sidebar-logo-mark"
                  aria-hidden="true"
                />
                <span
                  className="dsh-claude-masked-word omp-sidebar-logo-word"
                  aria-label="Claude"
                />
              </>
            ) : (
              <span className="omp-sidebar-deepseek-word">deepseek</span>
            )}
          </button>

          <button
            type="button"
            className="omp-sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(true)}
            title="收起侧栏"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.35">
              <rect x="2" y="2.5" width="12" height="11" rx="2" />
              <path d="M6 2.5v11" />
            </svg>
          </button>
        </div>

        <nav className="omp-sidebar-nav">
          <button
            type="button"
            className="omp-nav-item is-new-session"
            onClick={() => setActiveSessionId(null)}
          >
            <span className="omp-new-session-icon" aria-hidden="true">
              <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 2.5v7M2.5 6h7" strokeLinecap="round" />
              </svg>
            </span>
            <span>新会话</span>
          </button>

          <button
            type="button"
            className="omp-nav-item"
            onClick={() => setSettingsOpen(true)}
          >
            <span className="omp-nav-icon-slot">
              <svg viewBox="0 0 16 16" width="13.5" height="13.5" fill="none" stroke="currentColor" strokeWidth="1.35">
                <path d="M6.5 2.5a1.5 1.5 0 0 1 3 0V4h2A1.5 1.5 0 0 1 13 5.5v2h-1.2a1.3 1.3 0 0 0 0 2.6H13v2A1.5 1.5 0 0 1 11.5 13.6h-2v-1.2a1.3 1.3 0 0 0-2.6 0v1.2h-2A1.5 1.5 0 0 1 3.4 12.1v-2h1.2a1.3 1.3 0 0 0 0-2.6H3.4v-2A1.5 1.5 0 0 1 4.9 4h1.6V2.5z" strokeLinejoin="round" />
              </svg>
            </span>
            <span>插件</span>
          </button>
        </nav>

        <div className="omp-sidebar-tree">
          <div className="omp-tree-section-head">
            <span>工作区</span>
            <div className="omp-tree-section-actions">
              <button
                type="button"
                className="omp-tree-head-btn"
                onClick={() => setSearchOpen((v) => !v)}
                title="筛选会话"
              >
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.35">
                  <path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className="omp-tree-head-btn"
                onClick={handleAddWorkspacePrompt}
                title="添加本地工作区目录"
              >
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.35">
                  <path d="M2 4.5A1.3 1.3 0 0 1 3.3 3.2h2.8l1.3 1.4h5.3A1.3 1.3 0 0 1 14 5.9v5.8a1.3 1.3 0 0 1-1.3 1.3H3.3A1.3 1.3 0 0 1 2 11.7V4.5z" />
                  <path d="M8 6.8v3.6M6.2 8.6h3.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="omp-sidebar-search-row">
              <input
                type="text"
                className="omp-sidebar-search-input"
                placeholder="筛选会话或项目…"
                value={searchQuery}
                autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {groupedWorkspaces.map((ws) => {
            const isCollapsed = Boolean(collapsedWorkspaces[ws.cwd]);
            return (
              <div key={ws.cwd} className="omp-ws-group">
                <button
                  type="button"
                  className="omp-ws-header"
                  onClick={() =>
                    setCollapsedWorkspaces((prev) => ({ ...prev, [ws.cwd]: !prev[ws.cwd] }))
                  }
                >
                  <span className="omp-ws-name">{ws.name}</span>
                  <svg
                    className={`omp-ws-chevron${isCollapsed ? ' is-collapsed' : ''}`}
                    viewBox="0 0 12 12"
                    width="11"
                    height="11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  >
                    <path d="M3 4.5L6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {!isCollapsed && (
                  <div className="omp-ws-sessions">
                    {ws.sessions.map((s, sIdx) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`omp-session-item${activeSessionId === s.id ? ' is-active' : ''}`}
                        onMouseEnter={() => handleSessionHoverEnter(s.id)}
                        onMouseLeave={handleSessionHoverLeave}
                        onClick={() => loadAndActivateSession(s.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSessionMenu({
                            sessionId: s.id,
                            title: s.title,
                            pinned: Boolean((s as any).pinned),
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                      >
                        <span className="omp-session-dot-slot">
                          <span
                            className={`omp-session-dot${s.running ? ' is-running' : ''}`}
                          />
                        </span>
                        <span className="omp-session-title">
                          {(s as any).pinned ? '📌 ' : ''}
                          {s.title}
                        </span>
                        <span className="omp-session-time">
                          {formatRelativeTime(s.updatedAt, sIdx)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Authentic dsh-claude-style Account Footer (account-footer.css) */}
        <div className="omp-sidebar-footer">
          <button
            type="button"
            className="dsh-claude-account-btn"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen((v) => !v)}
          >
            <span className="dsh-claude-account-avatar" aria-hidden="true" />
            <span className="dsh-claude-account-name">{bootstrap.user.displayName}</span>
            <span className="dsh-claude-account-chevron" aria-hidden="true" />
          </button>

          {accountMenuOpen && (
            <div className="dsh-claude-popover-card omp-account-popover">
              <button
                type="button"
                className="omp-popover-item"
                onClick={() => {
                  updateSettings({ scheme: isDark ? 'light' : 'dark' });
                  setAccountMenuOpen(false);
                }}
              >
                <span>{isDark ? '切换到浅色模式 (Light)' : '切换到深色模式 (Dark)'}</span>
              </button>
              <button
                type="button"
                className="omp-popover-item"
                onClick={() => {
                  setSettingsOpen(true);
                  setAccountMenuOpen(false);
                }}
              >
                <span>Claude Style 外观与字体设置…</span>
              </button>
              <button
                type="button"
                className="omp-popover-item"
                onClick={() => {
                  setWorkbenchTab((prev) => (prev ? null : 'files'));
                  setAccountMenuOpen(false);
                }}
              >
                <span>打开右侧研发工作台</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="omp-main" data-pane="conversation">
        <header className="omp-topbar">
          <div className="omp-topbar-left">
            {sidebarCollapsed && (
              <button
                type="button"
                className="omp-topbar-icon-btn"
                onClick={() => setSidebarCollapsed(false)}
                title="展开侧栏"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.35">
                  <rect x="2" y="2.5" width="12" height="11" rx="2" />
                  <path d="M6 2.5v11" />
                </svg>
              </button>
            )}

            {activeSessionId !== null && activeView && (
              <div className="omp-header-title-cluster">
                {editingHeaderTitle ? (
                  <input
                    className="omp-header-title-input"
                    value={draftHeaderTitle}
                    autoFocus
                    onChange={(e) => setDraftHeaderTitle(e.target.value)}
                    onBlur={() => {
                      setEditingHeaderTitle(false);
                      if (draftHeaderTitle.trim() && draftHeaderTitle.trim() !== activeView.title) {
                        handleRenameSession(activeSessionId, draftHeaderTitle.trim());
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingHeaderTitle(false);
                        if (draftHeaderTitle.trim() && draftHeaderTitle.trim() !== activeView.title) {
                          handleRenameSession(activeSessionId, draftHeaderTitle.trim());
                        }
                      } else if (e.key === 'Escape') {
                        setEditingHeaderTitle(false);
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="omp-header-serif-title"
                    onClick={() => {
                      setDraftHeaderTitle(activeView.title);
                      setEditingHeaderTitle(true);
                    }}
                    title="点击重命名会话"
                  >
                    {activeView.title}
                  </button>
                )}
                <span className="omp-header-mode-tag">标准模式</span>
              </div>
            )}
          </div>

          {activeSessionId !== null && (
            <div className="omp-topbar-center">
              <div className="dsh-claude-view-switch" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'chat'}
                  data-active={viewMode === 'chat' ? '' : undefined}
                  onClick={() => setViewMode('chat')}
                >
                  对话
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'trace'}
                  data-active={viewMode === 'trace' ? '' : undefined}
                  onClick={() => setViewMode('trace')}
                >
                  轨迹
                </button>
              </div>
            </div>
          )}

          <div className="omp-topbar-right">
            {activeSessionId !== null && (
              <>
                <button
                  type="button"
                  className="omp-topbar-folder-pill"
                  onClick={() => setWorkbenchTab((prev) => (prev === 'files' ? null : 'files'))}
                  title="打开项目文件与 Git 面板"
                >
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.35">
                    <path d="M2 4.5A1.3 1.3 0 0 1 3.3 3.2h2.8l1.3 1.4h5.3A1.3 1.3 0 0 1 14 5.9v5.8a1.3 1.3 0 0 1-1.3 1.3H3.3A1.3 1.3 0 0 1 2 11.7V4.5z" />
                  </svg>
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M3 4.5L6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="omp-topbar-icon-btn"
                  onClick={(e) => {
                    if (!activeView) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSessionMenu({
                      sessionId: activeSessionId,
                      title: activeView.title,
                      x: rect.right - 180,
                      y: rect.bottom + 6,
                    });
                  }}
                  title="更多会话操作"
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <circle cx="3.5" cy="8" r="1.2" />
                    <circle cx="8" cy="8" r="1.2" />
                    <circle cx="12.5" cy="8" r="1.2" />
                  </svg>
                </button>
              </>
            )}

            <button
              type="button"
              className={`omp-topbar-icon-btn${workbenchTab ? ' is-active' : ''}`}
              onClick={() => setWorkbenchTab((prev) => (prev ? null : 'files'))}
              title="切换右侧工作台 (文件 / Git / 终端 / 定时 / 能力)"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.35">
                <rect x="2" y="2.5" width="12" height="11" rx="2" />
                <path d="M10 2.5v11" />
              </svg>
            </button>
          </div>
        </header>

        {activeSessionId === null ? (
          <div className="omp-home-stage">
            <div className="omp-home-stack">
              <HomeDashboard
                displayName={bootstrap.user.displayName}
                brand={settings.brand}
                homeLayout={settings.homeLayout}
                dashboard={bootstrap.usageDashboard}
              />

              {renderComposerCard(true)}
            </div>
          </div>
        ) : (
          <>
            {keepAliveIds.map((keptId) => {
              const view = sessionViews[keptId];
              const isVisible = keptId === activeSessionId;
              if (!view) return null;
              return (
                <div
                  key={keptId}
                  style={{
                    display: isVisible ? 'flex' : 'none',
                    flexDirection: 'column',
                    flex: '1 1 auto',
                    overflow: 'hidden',
                  }}
                >
                  <ConversationView
                    sessionId={keptId}
                    title={view.title}
                    turns={view.turns}
                    hasMore={view.hasMore}
                    processLayout={settings.processLayout}
                    reducedMotion={settings.reducedMotion}
                    viewMode={viewMode}
                    onRenameSession={(newTitle) => handleRenameSession(keptId, newTitle)}
                    onLoadMore={() => handleLoadMore(keptId)}
                    onForkTurn={(turnId) => handleForkTurn(keptId, turnId)}
                    onRegenerateTurn={(promptText) => handleSendPrompt(promptText)}
                  />
                  {renderComposerCard(false)}
                </div>
              );
            })}
          </>
        )}
      </main>

        {cmdPaletteOpen && (
          <CommandPalette
            open={cmdPaletteOpen}
            activeWorkspaceCwd={activeWorkspaceCwd}
            onClose={() => setCmdPaletteOpen(false)}
            onSelectSession={(sid) => {
              loadAndActivateSession(sid);
              setCmdPaletteOpen(false);
            }}
            onNewSession={() => {
              setActiveSessionId(null);
              setCmdPaletteOpen(false);
            }}
            onOpenWorkbench={(tab) => {
              setWorkbenchTab(tab);
              setCmdPaletteOpen(false);
            }}
            onInsertText={(text) => {
              setDraftText((prev) => `${prev ? prev.trimEnd() + ' ' : ''}${text}`);
              setCmdPaletteOpen(false);
            }}
            onRunSlash={(cmd) => {
              handleSendPrompt(cmd);
              setCmdPaletteOpen(false);
            }}
            onToggleTheme={() => updateSettings({ scheme: isDark ? 'light' : 'dark' })}
            onOpenSettings={() => {
              setSettingsOpen(true);
              setCmdPaletteOpen(false);
            }}
          />
        )}

      {workbenchTab && (
        <WorkbenchDrawer
          cwd={activeWorkspaceCwd}
          activeTab={workbenchTab}
          onSelectTab={setWorkbenchTab}
          onClose={() => setWorkbenchTab(null)}
          onInsertText={(text) =>
            setDraftText((prev) => `${prev ? prev.trimEnd() + ' ' : ''}${text}`)
          }
          onActivateSession={(sid) => loadAndActivateSession(sid)}
        />
      )}

      {sessionMenu && (
        <div
          className="omp-context-backdrop"
          onClick={() => setSessionMenu(null)}
        >
          <div
            className="dsh-claude-popover-card omp-session-context-menu"
            style={{
              left: Math.min(sessionMenu.x, window.innerWidth - 195),
              top: Math.min(sessionMenu.y, window.innerHeight - 210),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="omp-popover-item"
              onClick={() => {
                handleTogglePinSession(sessionMenu.sessionId, !sessionMenu.pinned);
                setSessionMenu(null);
              }}
            >
              <span>{sessionMenu.pinned ? '取消置顶会话' : '置顶会话'}</span>
            </button>
            <button
              type="button"
              className="omp-popover-item"
              onClick={() => {
                handleExportSession(sessionMenu.sessionId);
                setSessionMenu(null);
              }}
            >
              <span>导出 Markdown 文档</span>
            </button>
            <button
              type="button"
              className="omp-popover-item"
              onClick={() => {
                handleCompactSession(sessionMenu.sessionId);
                setSessionMenu(null);
              }}
            >
              <span>压缩上下文 (/compact)</span>
            </button>
            <button
              type="button"
              className="omp-popover-item"
              onClick={() => {
                handleForkTurn(sessionMenu.sessionId, '');
                setSessionMenu(null);
              }}
            >
              <span>创建会话分支 (Fork)</span>
            </button>
            <button
              type="button"
              className="omp-popover-item is-danger"
              onClick={() => {
                handleDeleteSession(sessionMenu.sessionId);
                setSessionMenu(null);
              }}
            >
              <span>删除会话</span>
            </button>
          </div>
        </div>
      )}

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
