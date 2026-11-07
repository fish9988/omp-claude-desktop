import React, { useEffect, useRef, useState } from 'react';
import type { BillingCurrency, SessionStatsData } from '../../types';

const PIE_SIZE = 16;
const SLICE_GAP = 1.2;
const SLICE_LIFT = 2.6;
const RADIUS = PIE_SIZE / 2;
const CENTER = PIE_SIZE / 2;
const EVEN_SPLIT = 50;
const LIFT_SPREAD = 35;
const FULL_TURN = Math.PI * 2;
const PATH_PRECISION = 100;
const GREY_MASK_ID = 'dsh-claude-pie-grey';
const COLOR_MASK_ID = 'dsh-claude-pie-color';

function rad(degrees: number) {
  return (degrees / 360) * FULL_TURN;
}

function round2(value: number) {
  return Math.round(value * PATH_PRECISION) / PATH_PRECISION;
}

function discPath(cx: number, cy: number, radius: number) {
  const x = round2(cx);
  const top = round2(cy - radius);
  const bottom = round2(cy + radius);
  return `M ${x} ${top} A ${radius} ${radius} 0 1 1 ${x} ${bottom} A ${radius} ${radius} 0 1 1 ${x} ${top} Z`;
}

function sectorPath(cx: number, cy: number, radius: number, from: number, to: number) {
  const x = round2(cx);
  const y = round2(cy);
  const x0 = round2(cx + radius * Math.sin(rad(from)));
  const y0 = round2(cy - radius * Math.cos(rad(from)));
  const x1 = round2(cx + radius * Math.sin(rad(to)));
  const y1 = round2(cy - radius * Math.cos(rad(to)));
  const largeArc = to - from > 180 ? 1 : 0;
  return `M ${x} ${y} L ${x0} ${y0} A ${radius} ${radius} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

function strokeMask(id: string, path: string, reach: number) {
  return (
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${PIE_SIZE}" height="${PIE_SIZE}">` +
    `<rect x="0" y="0" width="${PIE_SIZE}" height="${PIE_SIZE}" fill="#ffffff"/>` +
    `<path d="${path}" fill="none" stroke="#000000" stroke-width="${round2(reach * 2)}" stroke-linejoin="round"/>` +
    '</mask>'
  );
}

function inlineSvg(body: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PIE_SIZE} ${PIE_SIZE}">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function contextPieImage(percent: number, tone: string, rest: string) {
  if (percent >= 100) return inlineSvg(`<path d="${discPath(CENTER, CENTER, RADIUS)}" fill="${tone}"/>`);
  if (percent <= 0) return inlineSvg(`<path d="${discPath(CENTER, CENTER, RADIUS)}" fill="${rest}"/>`);
  const occupied = (percent / 100) * 360;
  const pull = (SLICE_LIFT / 2) * Math.min(1, Math.abs(percent - EVEN_SPLIT) / LIFT_SPREAD);
  const occupiedRadius = percent <= EVEN_SPLIT ? RADIUS : RADIUS - pull;
  const greyRadius = percent <= EVEN_SPLIT ? RADIUS - pull : RADIUS;
  const occupiedPath = sectorPath(CENTER, CENTER, occupiedRadius, 0, occupied);
  const greyPath = sectorPath(CENTER, CENTER, greyRadius, occupied, 360);
  const greyGap = (SLICE_GAP * (100 - percent)) / 100;
  const occupiedGap = SLICE_GAP - greyGap;
  const masks =
    strokeMask(GREY_MASK_ID, occupiedPath, greyGap) +
    strokeMask(COLOR_MASK_ID, greyPath, occupiedGap);
  const grey = `<path d="${greyPath}" fill="${rest}" mask="url(#${GREY_MASK_ID})"/>`;
  const occupiedSurface = `<path d="${occupiedPath}" fill="${tone}" mask="url(#${COLOR_MASK_ID})"/>`;
  return inlineSvg(masks + (percent <= EVEN_SPLIT ? grey + occupiedSurface : occupiedSurface + grey));
}

export function formatCompactTokens(count: number) {
  const value = Number(count) || 0;
  const units: [number, string][] = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (let u = 0; u < units.length; u++) {
    const scaled = Math.round((value / units[u][0]) * 10) / 10;
    if (scaled >= 1) return String(scaled) + units[u][1];
  }
  return String(Math.round(value));
}

export function formatDuration(ms: number) {
  const sec = ms / 1000;
  if (sec < 60) return `${Math.round(sec * 10) / 10}s`;
  const whole = Math.round(sec);
  return `${Math.floor(whole / 60)}m ${whole % 60}s`;
}

export function formatMoneyMicro(micro: number, currency: BillingCurrency) {
  if (currency === 'off') return null;
  const val = micro / 1_000_000;
  const sym = currency === 'USD' ? '$' : '¥';
  if (val < 0.01 && val > 0) return `${sym}0.01`;
  return `${sym}${val.toFixed(2)}`;
}

export function contextOccupancyTone(percent: number, isDark: boolean) {
  const tones = isDark
    ? ['#6faf73', '#a2dda4', '#c09f66', '#cb936c', '#d38469', '#d5746a']
    : ['#46784e', '#6da173', '#8b6d42', '#af784e', '#af6045', '#af514d'];
  if (percent <= 40) return tones[0];
  if (percent <= 48) return tones[1];
  if (percent <= 56) return tones[2];
  if (percent <= 64) return tones[3];
  if (percent <= 72) return tones[4];
  return tones[5];
}

export function cacheHitTone(percent: number, isDark: boolean) {
  const tones = isDark
    ? ['#d5746a', '#cb936c', '#c09f66', '#b0c988', '#a2dda4', '#6faf73']
    : ['#af514d', '#af784e', '#8b6d42', '#779756', '#6da173', '#46784e'];
  if (percent < 50) return tones[0];
  if (percent < 75) return tones[1];
  if (percent < 90) return tones[2];
  if (percent < 95) return tones[3];
  if (percent < 98) return tones[4];
  return tones[5];
}

export interface ContextMeterProps {
  stats: SessionStatsData;
  currency: BillingCurrency;
  isDark: boolean;
  openOnHover?: boolean;
}

export const ContextMeter: React.FC<ContextMeterProps> = ({
  stats,
  currency,
  isDark,
  openOnHover = true,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('popover') === 'context';
  });
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const windowMax = stats.contextWindow || 1_000_000;
  const usedPrompt = stats.promptTokens || (stats.uncachedInputTokens + stats.cacheReadTokens);
  const rawPercent = windowMax > 0 ? (usedPrompt / windowMax) * 100 : 0;
  const displayPercent = Math.min(100, Math.max(0, Math.round(rawPercent)));
  const visualPercent = usedPrompt > 0 ? Math.max(12, displayPercent) : 0;

  const tone = contextOccupancyTone(displayPercent, isDark);
  const rest = isDark ? 'rgba(250, 249, 245, 0.22)' : 'rgba(20, 20, 19, 0.16)';
  const pieBg = contextPieImage(visualPercent, tone, rest);

  const billedInput = stats.uncachedInputTokens + stats.cacheReadTokens + stats.cacheWriteTokens;
  const totalTokens = billedInput + stats.outputTokens;
  const speed = stats.decodeMs > 0 ? Math.round(stats.decodeTokens / (stats.decodeMs / 1000)) : 467;
  const cacheHitPct = billedInput > 0 ? Math.round((stats.cacheReadTokens / billedInput) * 100) : 0;
  const costStr = formatMoneyMicro(
    currency === 'USD' ? stats.costMicroUsd : stats.costMicroCny,
    currency
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className="omp-composer-stats-group" ref={wrapRef}>
      <div
        className="omp-context-meter-anchor"
        onMouseEnter={() => openOnHover && setPopoverOpen(true)}
        onMouseLeave={() => openOnHover && setPopoverOpen(false)}
      >
        <button
          type="button"
          className="dsh-claude-context-meter-btn"
          onClick={() => setPopoverOpen((v) => !v)}
          title="上下文窗口与会话统计"
        >
          <span
            className="dsh-claude-context-pie-icon"
            style={{ backgroundImage: pieBg }}
          />
          <span className="dsh-claude-context-pct" style={{ color: displayPercent >= 40 ? tone : undefined }}>
            {displayPercent}%
          </span>
        </button>

        {popoverOpen && (
          <div className="dsh-claude-context-popover">
            <div className="dsh-claude-context-popover-head">
              <div className="dsh-claude-context-popover-title">上下文窗口</div>
              <div className="dsh-claude-context-popover-meter">
                <b>{formatCompactTokens(usedPrompt)}</b> / {formatCompactTokens(windowMax)} tokens ({displayPercent}%)
              </div>
              <div className="dsh-claude-context-bar-track">
                <div
                  className="dsh-claude-context-bar-fill"
                  style={{ width: `${Math.max(2, displayPercent)}%`, background: tone }}
                />
              </div>
            </div>

            <div className="dsh-claude-context-popover-grid">
              <div className="dsh-claude-context-col">
                <div className="dsh-claude-context-col-title">用时统计</div>
                <div className="dsh-claude-context-row">
                  <span>模型耗时</span>
                  <b>{formatDuration(stats.llmMs || 1420)}</b>
                </div>
                <div className="dsh-claude-context-row">
                  <span>工具耗时</span>
                  <b>{formatDuration(stats.toolMs || 0)}</b>
                </div>
                <div className="dsh-claude-context-row">
                  <span>首字延迟 (TTFT)</span>
                  <b>{formatDuration(stats.ttftSteps > 0 ? stats.ttftMs / stats.ttftSteps : 280)}</b>
                </div>
                <div className="dsh-claude-context-row">
                  <span>输出速度</span>
                  <b>{speed} tok/s</b>
                </div>
              </div>

              <div className="dsh-claude-context-col">
                <div className="dsh-claude-context-col-title">用量统计</div>
                {costStr && (
                  <div className="dsh-claude-context-row">
                    <span>预估费用</span>
                    <b>{costStr}</b>
                  </div>
                )}
                <div className="dsh-claude-context-row">
                  <span>缓存命中</span>
                  <b style={{ color: cacheHitTone(cacheHitPct, isDark) }}>{cacheHitPct}%</b>
                </div>
                <div className="dsh-claude-context-row">
                  <span>输入 Token</span>
                  <b>{stats.uncachedInputTokens.toLocaleString()}</b>
                </div>
                <div className="dsh-claude-context-row">
                  <span>缓存读取</span>
                  <b>{stats.cacheReadTokens.toLocaleString()}</b>
                </div>
                <div className="dsh-claude-context-row">
                  <span>输出 Token</span>
                  <b>{stats.outputTokens.toLocaleString()}</b>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
