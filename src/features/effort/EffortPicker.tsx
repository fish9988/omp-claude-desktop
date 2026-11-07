import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { EffortLevel } from '../../types';

export interface EffortPickerProps {
  value: EffortLevel;
  onChange: (level: EffortLevel) => void;
  openOnHover?: boolean;
  defaultOpen?: boolean;
}

const EFFORT_STEPS: Array<{
  id: EffortLevel;
  shortEn: string;
  label: string;
  strength: number;
  desc: string;
}> = [
  { id: 'off', shortEn: 'Off', label: '关闭', strength: 0, desc: '关闭扩展思考，直接输出回答。' },
  { id: 'minimal', shortEn: 'Min', label: '极简', strength: 10, desc: '轻量级快速思考，适合简单指令。' },
  { id: 'low', shortEn: 'Low', label: '低', strength: 20, desc: '基础推理，兼顾响应速度与准确度。' },
  { id: 'medium', shortEn: 'Medium', label: '中', strength: 40, desc: '均衡思考深度，适合日常编码任务。' },
  { id: 'high', shortEn: 'High', label: '高', strength: 60, desc: '深度多步推理，适合架构设计与复杂调试。' },
  { id: 'xhigh', shortEn: 'XHigh', label: '超高', strength: 80, desc: '高强度长链推理，适合疑难问题攻坚。' },
  { id: 'max', shortEn: 'Max', label: '拉满', strength: 90, desc: '最大化推理预算，探索全部可能路径。' },
];

const FLASH_S = 2.4;
const FLOW_S = 3.2;
const FLOW_CLUSTERS = 9;
const FLOW_ROW_SHIFT = 0.03;
const FLOW_JITTER = 0.05;

function cellUnit(r: number, c: number, seed: number): number {
  let h =
    Math.imul(r + 1, 0x9e3779b1) ^
    Math.imul(c + 1, 0x85ebca6b) ^
    Math.imul(seed + 1, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 15), 0x2545f491);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function flowStrength(r: number, c: number, fx: number): number {
  const cluster = Math.min(FLOW_CLUSTERS - 1, Math.floor(fx * FLOW_CLUSTERS));
  const coarse = cellUnit(cluster, r, 6);
  const fine = cellUnit(r, c, 7);
  const gate = coarse * 0.4 + fine * 0.6;
  return 0.04 + smoothstep(0.46, 0.58, gate) * 0.92;
}

function cellFade(fx: number): number {
  if (fx <= 0.05) return 0;
  if (fx >= 0.75) return 1;
  const t = (fx - 0.05) / 0.7;
  return t * t * (3 - 2 * t);
}

function solveMatrix(wDev: number, dpr: number) {
  const ROWS = 5;
  const gap = Math.max(1, Math.round(1 * dpr));
  const margin = Math.max(1, Math.round(0.5 * dpr));
  const hDev = Math.round(26 * dpr);
  const block = Math.max(3, Math.floor((hDev - 2 * margin - (ROWS - 1) * gap) / ROWS));
  const cols = Math.max(1, Math.floor((wDev + gap) / (block + gap)));
  const restX = wDev - (cols * block + (cols - 1) * gap);
  const restY = hDev - (ROWS * block + (ROWS - 1) * gap);
  return {
    cols,
    rows: ROWS,
    sq: block / dpr,
    gap: gap / dpr,
    padTop: Math.floor(restY / 2) / dpr,
    padBottom: (restY - Math.floor(restY / 2)) / dpr,
    padLeft: Math.floor(restX / 2) / dpr,
    padRight: (restX - Math.floor(restX / 2)) / dpr,
  };
}

export const EffortPicker: React.FC<EffortPickerProps> = ({
  value,
  onChange,
  openOnHover = false,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(() => {
    if (defaultOpen) return true;
    const params = new URLSearchParams(window.location.search);
    return params.get('popover') === 'effort';
  });
  const [dragging, setDragging] = useState(false);
  const [trackWidth, setTrackWidth] = useState(250);
  const [dragTravel, setDragTravel] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const currentIdx = Math.max(
    0,
    EFFORT_STEPS.findIndex((s) => s.id === value)
  );
  const currentStep = EFFORT_STEPS[currentIdx] ?? EFFORT_STEPS[4];
  const isApex = currentIdx >= 4; // Show particle matrix on high / xhigh / max
  const tintPercent = Math.round((currentIdx / (EFFORT_STEPS.length - 1)) * 100);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      if (trackRef.current && trackRef.current.clientWidth > 0) {
        setTrackWidth(trackRef.current.clientWidth);
      }
    };
    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const knobSize = 16;
  const span = Math.max(0, trackWidth - knobSize);
  const restingX =
    EFFORT_STEPS.length > 1
      ? Math.round((currentIdx / (EFFORT_STEPS.length - 1)) * span)
      : span;
  const activeX = dragTravel !== null ? Math.round(dragTravel) : restingX;
  const fillWidth = `${activeX + 8}px`;

  const dpr = typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const matrixLayout = useMemo(
    () => solveMatrix(Math.round(trackWidth * dpr), dpr),
    [trackWidth, dpr]
  );

  const commitFromClientX = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const raw = clientX - rect.left - knobSize / 2;
    const clamped = Math.max(0, Math.min(span, raw));
    const ratio = span > 0 ? clamped / span : 0;
    const idx = Math.round(ratio * (EFFORT_STEPS.length - 1));
    const next = EFFORT_STEPS[Math.max(0, Math.min(EFFORT_STEPS.length - 1, idx))];
    if (next) onChange(next.id);
    return clamped;
  };

  return (
    <div
      className="omp-effort-picker-anchor"
      ref={wrapRef}
      onMouseEnter={() => openOnHover && setOpen(true)}
      onMouseLeave={() => openOnHover && !dragging && setOpen(false)}
    >
      <button
        type="button"
        className="dsh-claude-effort-btn dsh-claude-effort-trigger"
        data-tint={currentIdx > 0 ? '' : undefined}
        style={
          {
            '--dsh-claude-effort-tint': String(tintPercent),
          } as React.CSSProperties
        }
        onClick={() => setOpen((v) => !v)}
        title={`思考强度: ${currentStep.label} (${currentStep.shortEn})`}
      >
        <span className="dsh-claude-effort-btn-label">{currentStep.shortEn}</span>
      </button>

      {open && (
        <div
          className="dsh-claude-popover-card dsh-claude-effort-popover"
          data-open="true"
        >
          <div
            className="dsh-claude-effort"
            data-apex={isApex ? '' : undefined}
            data-tint={currentIdx > 0 ? '' : undefined}
            data-dragging={dragging ? '' : undefined}
            style={
              {
                '--dsh-claude-effort-tint': String(tintPercent),
              } as React.CSSProperties
            }
          >
            <div className="dsh-claude-effort-head">
              <span className="dsh-claude-effort-label">思考强度</span>
              <span className="dsh-claude-effort-value">{currentStep.label}</span>
            </div>

            <div className="dsh-claude-effort-ends">
              <span className="dsh-claude-effort-end">更快</span>
              <span className="dsh-claude-effort-end">更强</span>
            </div>

            <div
              ref={trackRef}
              className="dsh-claude-effort-track"
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={EFFORT_STEPS.length - 1}
              aria-valuenow={currentIdx}
              aria-valuetext={currentStep.label}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragging(true);
                const pos = commitFromClientX(e.clientX);
                if (typeof pos === 'number') setDragTravel(pos);
              }}
              onPointerMove={(e) => {
                if (!dragging) return;
                const pos = commitFromClientX(e.clientX);
                if (typeof pos === 'number') setDragTravel(pos);
              }}
              onPointerUp={() => {
                setDragging(false);
                setDragTravel(null);
              }}
              onPointerCancel={() => {
                setDragging(false);
                setDragTravel(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const next = EFFORT_STEPS[Math.min(EFFORT_STEPS.length - 1, currentIdx + 1)];
                  if (next) onChange(next.id);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const prev = EFFORT_STEPS[Math.max(0, currentIdx - 1)];
                  if (prev) onChange(prev.id);
                }
              }}
            >
              <div className="dsh-claude-effort-fill" style={{ width: fillWidth }} />

              <div className="dsh-claude-effort-ticks">
                {EFFORT_STEPS.map((step, idx) => {
                  const leftPx =
                    EFFORT_STEPS.length > 1
                      ? Math.round((idx / (EFFORT_STEPS.length - 1)) * span) + 8
                      : 8;
                  return (
                    <div
                      key={step.id}
                      className="dsh-claude-effort-tick"
                      style={{ left: `${leftPx}px` }}
                    />
                  );
                })}
              </div>

              <div
                className="dsh-claude-effort-matrix"
                style={{
                  gap: `${matrixLayout.gap}px`,
                  padding: `${matrixLayout.padTop}px ${matrixLayout.padRight}px ${matrixLayout.padBottom}px ${matrixLayout.padLeft}px`,
                  gridTemplateColumns: `repeat(${matrixLayout.cols}, ${matrixLayout.sq}px)`,
                  gridAutoRows: `${matrixLayout.sq}px`,
                }}
              >
                {Array.from({ length: matrixLayout.rows }).map((_, r) =>
                  Array.from({ length: matrixLayout.cols }).map((__, c) => {
                    const fx = matrixLayout.cols > 1 ? c / (matrixLayout.cols - 1) : 1;
                    const fade = cellFade(fx);
                    const entrance =
                      (1 - fx) * FLASH_S * 0.31 + cellUnit(r, c, 4) * FLASH_S * 0.055;
                    const flow =
                      fx * FLOW_S +
                      r * FLOW_S * FLOW_ROW_SHIFT +
                      cellUnit(r, c, 5) * FLOW_S * FLOW_JITTER;
                    const flashMix = `${(62 - cellUnit(r, c, 1) * 22).toFixed(1)}%`;
                    return (
                      <div
                        key={`${r}-${c}`}
                        className="dsh-claude-effort-matrix-cell"
                        style={{ animationDelay: `${entrance.toFixed(3)}s` }}
                      >
                        <div
                          className="dsh-claude-effort-matrix-sq"
                          style={
                            {
                              opacity: fade.toFixed(3),
                              '--dsh-flash-mix': flashMix,
                              '--dsh-front-delay': `${entrance.toFixed(3)}s`,
                              '--dsh-flow-delay': `-${flow.toFixed(3)}s`,
                              '--dsh-flow-strength': flowStrength(r, c, fx).toFixed(3),
                            } as React.CSSProperties
                          }
                        />
                      </div>
                    );
                  })
                )}
              </div>

              <div
                className="dsh-claude-effort-knob"
                style={{ translate: `${activeX}px` } as React.CSSProperties}
              />
            </div>

            <div className="omp-effort-step-pills">
              {EFFORT_STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  type="button"
                  className={`omp-effort-step-pill${idx === currentIdx ? ' is-active' : ''}`}
                  onClick={() => onChange(step.id)}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
