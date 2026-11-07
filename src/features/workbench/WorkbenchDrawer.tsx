import React from 'react';
import { FilePanel } from './FilePanel';
import { GitPanel } from './GitPanel';
import { TerminalPanel } from './TerminalPanel';
import { SchedulePanel } from './SchedulePanel';
import { CapabilitiesPanel } from './CapabilitiesPanel';

export type WorkbenchTabId = 'files' | 'git' | 'term' | 'sched' | 'caps';

const TABS: Array<{ id: WorkbenchTabId; label: string }> = [
  { id: 'files', label: '文件' },
  { id: 'git', label: 'Git' },
  { id: 'term', label: '终端' },
  { id: 'sched', label: '定时' },
  { id: 'caps', label: '能力' },
];

export const WorkbenchDrawer = ({
  cwd,
  activeTab,
  onSelectTab,
  onInsertText,
  onActivateSession,
  onClose,
}: {
  cwd: string;
  activeTab: WorkbenchTabId;
  onSelectTab: (tab: WorkbenchTabId) => void;
  onInsertText?: (text: string) => void;
  onActivateSession?: (sessionId: string) => void;
  onClose: () => void;
}) => {
  return (
    <aside className="omp-workbench-drawer" data-dsh-claude-part="rightbar-column">
      <div className="omp-workbench-header">
        <div className="dsh-claude-view-switch omp-workbench-tabs" role="tablist">
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-active={active ? '' : undefined}
                className={`omp-workbench-tab${active ? ' is-active' : ''}`}
                onClick={() => onSelectTab(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="omp-wb-close-btn"
          onClick={onClose}
          title="收起右侧工作台"
          aria-label="收起右侧工作台"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="2" y="2.5" width="12" height="11" rx="2" />
            <path d="M10 2.5v11" />
            <path d="M6.5 6.5L8.2 8 6.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="omp-workbench-content">
        {activeTab === 'files' && <FilePanel cwd={cwd} onInsertReference={onInsertText} />}
        {activeTab === 'git' && <GitPanel cwd={cwd} />}
        {activeTab === 'term' && <TerminalPanel cwd={cwd} />}
        {activeTab === 'sched' && (
          <SchedulePanel cwd={cwd} onRunActivatedSession={onActivateSession} />
        )}
        {activeTab === 'caps' && <CapabilitiesPanel onInsertCommand={onInsertText} />}
      </div>
    </aside>
  );
};
