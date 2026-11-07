import React, { useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import type { ProcessLayoutMode, ProcessStepItem, TurnItem } from '../../types';
import { WaitLoader } from '../wait/WaitLoader';
import { formatCompactTokens, formatDuration } from '../context/ContextMeter';

export interface ConversationViewProps {
  sessionId: string;
  title: string;
  turns: TurnItem[];
  hasMore: boolean;
  processLayout: ProcessLayoutMode;
  reducedMotion: boolean;
  viewMode?: 'chat' | 'trace';
  onRenameSession: (newTitle: string) => void;
  onLoadMore: () => void;
  onForkTurn: (turnId: string) => void;
  onRegenerateTurn: (turnPrompt: string) => void;
}

function highlightCodeHtml(escapedCode: string): string {
  // Lightweight, safe tokenizer over HTML-escaped code
  return escapedCode
    .replace(
      /(\/\/[^\n]*|#[^\n]*)/g,
      '<span class="dsh-syn-comment">$1</span>'
    )
    .replace(
      /(&quot;.*?&quot;|&#39;.*?&#39;|'[^'\n]*'|"[^"\n]*")/g,
      '<span class="dsh-syn-string">$1</span>'
    )
    .replace(
      /\b(export|import|from|function|return|const|let|var|async|await|if|else|for|while|type|interface|class|extends|implements|new|try|catch|finally|true|false|null|undefined)\b/g,
      '<span class="dsh-syn-keyword">$1</span>'
    )
    .replace(
      /\b(number|string|boolean|void|any|never|Record|Array|Promise)\b/g,
      '<span class="dsh-syn-type">$1</span>'
    )
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="dsh-syn-number">$1</span>');
}

function formatClockTime(ts?: number): string {
  if (!ts) return '05:49';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '05:49';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function renderMarkdownHtml(md: string): string {
  if (!md) return '';
  try {
    let rawHtml = marked.parse(md, { gfm: true, breaks: true }) as string;

    // Transform GFM checkboxes into Claude Style terracotta/accent checkboxes
    rawHtml = rawHtml
      .replace(
        /<li>\s*<input[^>]*checked[^>]*>\s*/gi,
        '<li class="dsh-claude-task-li is-checked"><span class="dsh-claude-checkbox is-checked" aria-hidden="true"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M2.5 6.2L5 8.7L9.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="dsh-claude-task-content">'
      )
      .replace(
        /<li>\s*<input[^>]*type="checkbox"[^>]*>\s*/gi,
        '<li class="dsh-claude-task-li"><span class="dsh-claude-checkbox" aria-hidden="true"></span><span class="dsh-claude-task-content">'
      );

    // Transform <pre><code class="language-xxx">...</code></pre> into .dsh-claude-codeblock
    rawHtml = rawHtml.replace(
      /<pre><code(?:\s+class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/gi,
      (_match, langGroup, codeBody) => {
        const lang = langGroup || 'ts';
        const plainCode = codeBody
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        const encoded = encodeURIComponent(plainCode);
        const highlighted = highlightCodeHtml(codeBody);
        return `<div class="dsh-claude-codeblock">
          <div class="dsh-claude-codeblock-bar">
            <span class="dsh-claude-codeblock-lang">${lang}</span>
            <div class="dsh-claude-codeblock-actions">
              <button type="button" class="dsh-claude-codeblock-btn" data-wrap-code="true" title="切换自动换行">
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.35">
                  <path d="M2.5 3.5v9M13.5 3.5v9M5.5 8h5m0 0L8.8 6.2M10.5 8l-1.7 1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button type="button" class="dsh-claude-codeblock-btn dsh-claude-codeblock-copy" data-copy-code="${encoded}" title="复制代码">
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.35">
                  <rect x="5" y="5" width="8" height="8" rx="1.5"/>
                  <path d="M3 11V3.5A.5.5 0 0 1 3.5 3H11" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
          <pre><code>${highlighted}</code></pre>
        </div>`;
      }
    );

    // Wrap <table>...</table> in <div class="dsh-claude-table-scroll">
    rawHtml = rawHtml.replace(
      /<table>([\s\S]*?)<\/table>/gi,
      '<div class="dsh-claude-table-scroll"><table>$1</table></div>'
    );

    return rawHtml;
  } catch {
    return md;
  }
}

const ProcessBlock: React.FC<{
  steps: ProcessStepItem[];
  durationMs: number;
  layout: ProcessLayoutMode;
  streaming?: boolean;
  forceOpen?: boolean;
}> = ({ steps, durationMs, layout, streaming, forceOpen = false }) => {
  const [groupOpen, setGroupOpen] = useState(forceOpen);
  const [openStepIds, setOpenStepIds] = useState<Record<string, boolean>>({});

  if (!steps || steps.length === 0) return null;

  const isExpanded = forceOpen || groupOpen;

  const toggleStep = (id: string) => {
    setOpenStepIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sec = Math.max(1, Math.round((durationMs || steps[0]?.durationMs || 1000) / 1000));
  const summaryText =
    steps.length <= 1
      ? `用时 ${sec} 秒`
      : `用时 ${sec} 秒 · ${steps.length} 步`;

  if (layout === 'flat') {
    return (
      <div className="dsh-claude-process-flat">
        {steps.map((step) => {
          const isOpen = Boolean(openStepIds[step.id]);
          return (
            <div key={step.id} className="dsh-claude-process-step-card">
              <button
                type="button"
                className="dsh-claude-process-step-head"
                onClick={() => toggleStep(step.id)}
              >
                <span className="dsh-claude-process-chevron">{isOpen ? '▾' : '▸'}</span>
                <span className="dsh-claude-process-verb">{step.verb || '执行'}</span>
                <span className="dsh-claude-process-target">{step.target || step.title}</span>
                {step.durationMs ? (
                  <span className="dsh-claude-process-dur">{formatDuration(step.durationMs)}</span>
                ) : null}
              </button>
              {isOpen && (
                <div className="dsh-claude-process-step-body">
                  {step.detail && <div className="dsh-claude-thinking-text">{step.detail}</div>}
                  {step.args && (
                    <pre className="dsh-claude-tool-io">
                      <code>{step.args}</code>
                    </pre>
                  )}
                  {step.output && (
                    <pre className="dsh-claude-tool-io is-output">
                      <code>{step.output}</code>
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`dsh-claude-process-column${isExpanded ? ' is-open' : ''}`}>
      <div className="dsh-claude-process-summary-row">
        <button
          type="button"
          className="dsh-claude-process-summary"
          onClick={() => setGroupOpen((v) => !v)}
        >
          <span className={`dsh-claude-process-summary-label${streaming ? ' is-shimmer' : ''}`}>
            {summaryText}
          </span>
          <svg
            className={`dsh-claude-process-caret${isExpanded ? ' is-open' : ''}`}
            viewBox="0 0 12 12"
            width="11"
            height="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 4.5L6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="dsh-claude-process-rule" />
      </div>

      {isExpanded && (
        <div className="dsh-claude-process-column-list">
          {steps.map((step) => {
            const isStepOpen = Boolean(openStepIds[step.id]);
            return (
              <div key={step.id} className="dsh-claude-process-row">
                <button
                  type="button"
                  className="dsh-claude-process-row-head"
                  onClick={() => toggleStep(step.id)}
                >
                  <span className="dsh-claude-process-dot" data-kind={step.kind} />
                  <span className="dsh-claude-process-verb">{step.verb || '步骤'}</span>
                  <span className="dsh-claude-process-target">{step.target || step.title}</span>
                  {step.durationMs ? (
                    <span className="dsh-claude-process-dur">{formatDuration(step.durationMs)}</span>
                  ) : null}
                </button>
                {isStepOpen && (
                  <div className="dsh-claude-process-row-detail">
                    {step.detail && <div className="dsh-claude-thinking-text">{step.detail}</div>}
                    {step.args && (
                      <pre className="dsh-claude-tool-io">
                        <code>{step.args}</code>
                      </pre>
                    )}
                    {step.output && (
                      <pre className="dsh-claude-tool-io is-output">
                        <code>{step.output}</code>
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TurnRow: React.FC<{
  turn: TurnItem;
  index: number;
  processLayout: ProcessLayoutMode;
  reducedMotion: boolean;
  viewMode: 'chat' | 'trace';
  onForkTurn: (turnId: string) => void;
  onRegenerateTurn: (promptText: string) => void;
}> = React.memo(({ turn, index, processLayout, reducedMotion, viewMode, onForkTurn, onRegenerateTurn }) => {
  const [copied, setCopied] = useState(false);

  const html = useMemo(
    () => renderMarkdownHtml(turn.assistantMessage?.text || ''),
    [turn.assistantMessage?.text]
  );

  const handleMarkdownClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const copyBtn = (e.target as HTMLElement).closest('[data-copy-code]') as HTMLElement | null;
    if (copyBtn) {
      const raw = decodeURIComponent(copyBtn.getAttribute('data-copy-code') || '');
      navigator.clipboard?.writeText(raw);
      return;
    }
    const wrapBtn = (e.target as HTMLElement).closest('[data-wrap-code]') as HTMLElement | null;
    if (wrapBtn) {
      const block = wrapBtn.closest('.dsh-claude-codeblock');
      if (block) block.classList.toggle('is-wrapped');
    }
  };

  const handleCopyTurn = () => {
    if (turn.assistantMessage?.text) {
      navigator.clipboard?.writeText(turn.assistantMessage.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleCopyUser = () => {
    navigator.clipboard?.writeText(turn.userMessage.text);
  };

  const totalTok =
    (turn.usage?.inputTokens || 0) + (turn.usage?.outputTokens || 0) || 5400;

  return (
    <div className="dsh-claude-turn" id={`turn-anchor-${turn.id}`} data-turn-index={index}>
      <div className="dsh-claude-user-group">
        <div className="dsh-claude-user-row">
          <div className="dsh-claude-user-bubble">{turn.userMessage.text}</div>
        </div>
        <div className="dsh-claude-user-meta">
          <span>{formatClockTime(turn.userMessage.timestamp)}</span>
          <button
            type="button"
            className="dsh-claude-user-copy"
            onClick={handleCopyUser}
            title="复制提问"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="5" y="5" width="8" height="8" rx="1.5" />
              <path d="M3 11V3.5A.5.5 0 0 1 3.5 3H11" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="dsh-claude-assistant-row">
        <ProcessBlock
          steps={turn.processSteps}
          durationMs={turn.processDurationMs}
          layout={processLayout}
          streaming={turn.streaming}
          forceOpen={viewMode === 'trace'}
        />

        {turn.streaming && !turn.assistantMessage?.text && (
          <WaitLoader
            word={turn.waitingWord || '思考中'}
            startedAt={turn.userMessage.timestamp}
            reducedMotion={reducedMotion}
          />
        )}

        {turn.assistantMessage?.text && (
          <div
            className="dsh-claude-markdown"
            onClick={handleMarkdownClick}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {turn.streaming && turn.assistantMessage?.text && (
          <WaitLoader
            word={turn.waitingWord || '生成回答'}
            startedAt={turn.userMessage.timestamp}
            reducedMotion={reducedMotion}
          />
        )}

        {!turn.streaming && turn.assistantMessage && (
          <div className="dsh-claude-turn-actions">
            <button
              type="button"
              className="dsh-claude-turn-action-btn"
              onClick={handleCopyTurn}
              title="复制回答"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.35">
                <rect x="5" y="5" width="8" height="8" rx="1.5" />
                <path d="M3 11V3.5A.5.5 0 0 1 3.5 3H11" strokeLinecap="round" />
              </svg>
              {copied && <span className="dsh-claude-action-tip">已复制</span>}
            </button>
            <button
              type="button"
              className="dsh-claude-turn-action-btn"
              onClick={() => onRegenerateTurn(turn.userMessage.text)}
              title="重新生成"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.35">
                <path d="M2.5 8a5.5 5.5 0 0 1 9.3-3.9L13.5 5.5M13.5 2v3.5H10" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.5 8a5.5 5.5 0 0 1-9.3 3.9L2.5 10.5M2.5 14v-3.5H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="dsh-claude-turn-action-btn"
              onClick={() => onForkTurn(turn.id)}
              title="从此处分支 (Fork Session)"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.35">
                <circle cx="5" cy="3.5" r="1.5" />
                <circle cx="11" cy="3.5" r="1.5" />
                <circle cx="8" cy="12.5" r="1.5" />
                <path d="M5 5v2a3 3 0 0 0 3 3m3-5v2a3 3 0 0 1-3 3m0 0v1" strokeLinecap="round" />
              </svg>
            </button>
            <span className="dsh-claude-turn-usage-meta">
              <span>用量 {formatCompactTokens(totalTok)} tok</span>
              <span>{formatClockTime(turn.assistantMessage.timestamp)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export const ConversationView: React.FC<ConversationViewProps> = ({
  turns,
  hasMore,
  processLayout,
  reducedMotion,
  viewMode = 'chat',
  onLoadMore,
  onForkTurn,
  onRegenerateTurn,
}) => {
  const [navHover, setNavHover] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollToTurn = (turnId: string) => {
    const el = document.getElementById(`turn-anchor-${turnId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="omp-conversation-stage">
      <div className="dsh-claude-conv-scroller" ref={scrollerRef} data-conversation-scroll="">
        <div className="dsh-claude-conv-column" data-chat-flow="">
          {hasMore && (
            <div className="dsh-claude-load-more-wrap">
              <button type="button" className="dsh-claude-load-more-btn" onClick={onLoadMore}>
                加载更早的历史消息…
              </button>
            </div>
          )}

          {turns.map((turn, idx) => (
            <TurnRow
              key={turn.id}
              turn={turn}
              index={idx}
              processLayout={processLayout}
              reducedMotion={reducedMotion}
              viewMode={viewMode}
              onForkTurn={onForkTurn}
              onRegenerateTurn={onRegenerateTurn}
            />
          ))}
        </div>
      </div>

      {/* Right-edge Turn Navigator Rail */}
      {turns.length > 0 && (
        <aside
          className={`dsh-claude-turn-nav${navHover ? ' is-open' : ''}`}
          onMouseEnter={() => setNavHover(true)}
          onMouseLeave={() => setNavHover(false)}
        >
          <div className="dsh-claude-turn-nav-ticks">
            {turns.map((t) => (
              <button
                key={t.id}
                type="button"
                className="dsh-claude-turn-nav-tick"
                onClick={() => scrollToTurn(t.id)}
                title={t.userMessage.text.slice(0, 40)}
              >
                <span className="dsh-claude-turn-nav-bar" />
              </button>
            ))}
          </div>

          {navHover && (
            <div className="dsh-claude-turn-nav-card">
              <div className="dsh-claude-turn-nav-card-head">会话轮次导航 ({turns.length})</div>
              <div className="dsh-claude-turn-nav-card-list">
                {turns.map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    className="dsh-claude-turn-nav-item"
                    onClick={() => scrollToTurn(t.id)}
                  >
                    <span className="dsh-claude-turn-nav-num">#{i + 1}</span>
                    <span className="dsh-claude-turn-nav-text">{t.userMessage.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
};
