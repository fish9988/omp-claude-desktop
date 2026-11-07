export type BrandPalette = 'claude' | 'deepseek' | 'custom';
export type ThemeScheme = 'light' | 'dark' | 'system';
export type HomeLayoutMode = 'studio' | 'classic' | 'off';
export type MascotCharacter = 'crab' | 'deepy' | 'whalegirl' | 'off';
export type MascotScope = 'all' | 'home';
export type ProcessLayoutMode = 'column' | 'flat';
export type PermissionMode = 'read' | 'edit' | 'yolo';
export type BillingCurrency = 'CNY' | 'USD' | 'off';
export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface CustomPaletteSeeds {
  accent: string;
  canvasLight: string;
  canvasDark: string;
  sidebarLight: string;
  sidebarDark: string;
  bubbleLight: string;
  bubbleDark: string;
}

export interface AppSettings {
  brand: 'claude' | 'deepseek';
  palette: BrandPalette;
  scheme: ThemeScheme;
  homeLayout: HomeLayoutMode;
  mascot: MascotCharacter;
  mascotScope: MascotScope;
  processLayout: ProcessLayoutMode;
  effortAccent: boolean;
  billingCurrency: BillingCurrency;
  reducedMotion: boolean;
  waitAnimation: 'sweep' | 'wash';
  uiFont: string;
  serifFont: string;
  codeFont: string;
  chatWidth: number;
  openPopoversOnHover: boolean;
  customSeeds: CustomPaletteSeeds;
  customPrices: Record<string, { input: number; output: number; cacheRead: number }>;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  cwd: string;
  sessionCount: number;
  updatedAt: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  cwd: string;
  workspaceName: string;
  updatedAt: number;
  createdAt: number;
  model: string;
  provider: string;
  thinkingLevel: ThinkingLevel;
  messageCount: number;
  totalTokens: number;
  running?: boolean;
  unread?: boolean;
  phase?: 'idle' | 'thinking' | 'working' | 'juggling' | 'sweeping' | 'notification';
}

export interface ProcessStepItem {
  id: string;
  kind: 'thinking' | 'tool' | 'subagent';
  title: string;
  verb?: string;
  target?: string;
  detail?: string;
  toolName?: string;
  args?: string;
  output?: string;
  isError?: boolean;
  durationMs?: number;
  running?: boolean;
}

export interface TurnItem {
  id: string;
  userMessage: {
    id: string;
    text: string;
    timestamp: number;
  };
  processSteps: ProcessStepItem[];
  processDurationMs: number;
  assistantMessage?: {
    id: string;
    text: string;
    model: string;
    provider: string;
    timestamp: number;
    durationMs: number;
    ttftMs: number;
    usage: {
      input: number;
      output: number;
      cacheRead: number;
      cacheWrite: number;
      totalTokens: number;
    };
    costMicroCny: number;
    costMicroUsd: number;
  };
  streaming?: boolean;
  waitingWord?: string;
  branches?: { index: number; total: number; ids: string[] };
}

export interface SessionStatsData {
  turns: number;
  steps: number;
  llmMs: number;
  toolMs: number;
  ttftMs: number;
  ttftSteps: number;
  decodeTokens: number;
  decodeMs: number;
  uncachedInputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  promptTokens: number;
  contextWindow: number;
  costMicroCny: number;
  costMicroUsd: number;
}

export interface UsageOverviewRange {
  sessionsCount: number;
  messagesCount: number;
  totalTokens: number;
  activeDays: number;
  peakHour: number;
  favoriteModel: string;
  yardstickBookZh: string | null;
  yardstickBookEn: string | null;
  modelBreakdown: Array<{
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    share: number;
  }>;
}

export interface HeatGridCell {
  date: string;
  tokens: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface DailyModelBar {
  date: string;
  total: number;
  slices: Array<{
    model: string;
    rank: number;
    tokens: number;
  }>;
}

export interface UsageDashboardData {
  all: UsageOverviewRange;
  d30: UsageOverviewRange;
  d7: UsageOverviewRange;
  heatGrid: {
    cells: HeatGridCell[];
    peak: number;
  };
  dailyModels: {
    days: DailyModelBar[];
    peak: number;
    topModels: string[];
  };
}

export interface ModelCatalogItem {
  id: string;
  name: string;
  provider: string;
  vendorIcon?: string;
  reasoning: boolean;
  contextWindow: number;
  maxTokens?: number;
  description?: string;
  peakRateStatus?: 'peak' | 'valley' | null;
  peakRateLabel?: string;
}

export interface BootstrapPayload {
  user: {
    name: string;
    displayName: string;
  };
  workspaces: WorkspaceSummary[];
  sessions: SessionSummary[];
  models: ModelCatalogItem[];
  usageDashboard: UsageDashboardData;
}
