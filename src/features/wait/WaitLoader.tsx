import React, { useEffect, useState } from 'react';

export interface WaitLoaderProps {
  word?: string;
  startedAt?: number;
  reducedMotion?: boolean;
}

type LoaderMode = 'bounce' | 'line' | 'orbit';
const MODES: LoaderMode[] = ['bounce', 'line', 'orbit'];

export const WaitLoader: React.FC<WaitLoaderProps> = ({
  word = '思考中',
  startedAt,
  reducedMotion = false,
}) => {
  const [mode, setMode] = useState<LoaderMode>(() => MODES[Math.floor(Math.random() * MODES.length)]);
  const [standingWord, setStandingWord] = useState(word);
  const [leavingWord, setLeavingWord] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Rotate loader geometry every 10s
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => {
      setMode((prev) => {
        const others = MODES.filter((m) => m !== prev);
        return others[Math.floor(Math.random() * others.length)];
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  // Two-copy blurred vertical wording swap
  useEffect(() => {
    if (word === standingWord) return;
    setLeavingWord(standingWord);
    setStandingWord(word);
    const t = setTimeout(() => setLeavingWord(null), 240);
    return () => clearTimeout(t);
  }, [word, standingWord]);

  // Tabular elapsed timer
  useEffect(() => {
    const origin = startedAt || Date.now();
    const tick = setInterval(() => {
      setElapsedSec((Date.now() - origin) / 1000);
    }, 200);
    return () => clearInterval(tick);
  }, [startedAt]);

  return (
    <div className="dsh-claude-chat-wait" data-reduced-motion={reducedMotion ? 'true' : undefined}>
      <div className={`dsh-claude-chat-wait-loader is-${mode}`} aria-hidden="true">
        {mode === 'bounce' && (
          <div className="dsh-claude-wait-lane is-bounce">
            <span className="dsh-claude-chat-wait-dot" style={{ left: 0, animationDelay: '-500ms' }} />
            <span className="dsh-claude-chat-wait-dot" style={{ left: 7, animationDelay: '-300ms' }} />
            <span className="dsh-claude-chat-wait-dot" style={{ left: 14, animationDelay: '-200ms' }} />
          </div>
        )}
        {mode === 'line' && (
          <div className="dsh-claude-wait-lane is-line">
            <span className="dsh-claude-chat-wait-dot is-line-1" />
            <span className="dsh-claude-chat-wait-dot is-line-2" />
            <span className="dsh-claude-chat-wait-dot is-line-3" />
          </div>
        )}
        {mode === 'orbit' && (
          <div className="dsh-claude-wait-lane is-orbit">
            <span className="dsh-claude-chat-wait-dot is-orbit-1" />
            <span className="dsh-claude-chat-wait-dot is-orbit-2" />
            <span className="dsh-claude-chat-wait-dot is-orbit-3" />
            <span className="dsh-claude-chat-wait-dot is-orbit-4" />
          </div>
        )}
      </div>

      <span className="dsh-claude-swap-label">
        {leavingWord && <span className="dsh-claude-swap-copy is-exit">{leavingWord}</span>}
        <span className="dsh-claude-swap-copy is-current dsh-claude-wait-shimmer">{standingWord}</span>
      </span>

      <span className="dsh-claude-wait-timer">{elapsedSec.toFixed(1)}s</span>
    </div>
  );
};
