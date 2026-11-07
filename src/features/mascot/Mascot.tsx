import React, { useEffect, useRef, useState } from 'react';
import crabUrlsRaw from './crab-urls.json';
import type { MascotCharacter } from '../../types';

export type MascotAnimKey =
  | 'idle'
  | 'idle-look'
  | 'idle-wave'
  | 'idle-laptop'
  | 'idle-spout'
  | 'thinking'
  | 'typing'
  | 'music'
  | 'conducting'
  | 'building'
  | 'error'
  | 'happy'
  | 'notification'
  | 'compacting'
  | 'sleeping'
  | 'waking'
  | 'poke-left'
  | 'poke-right'
  | 'tickle'
  | 'drag';

interface MascotSheet {
  frames: number;
  box: [number, number, number, number];
  still: number;
  columns?: number;
  durs?: number[];
}

const CRAB_URLS = crabUrlsRaw as Record<string, { body: string; ink: string }>;

const DEEPY_SHEET_URLS: Record<string, string> = {
  idle: '/dsh-claude-style/assets/22360387d0e1.svg',
  'idle-look': '/dsh-claude-style/assets/ae2250afa4d4.svg',
  'idle-spout': '/dsh-claude-style/assets/7f10aaf08b36.svg',
  thinking: '/dsh-claude-style/assets/07ba49c55318.svg',
  typing: '/dsh-claude-style/assets/917b19426a88.svg',
  music: '/dsh-claude-style/assets/e4c4d54e666e.svg',
  conducting: '/dsh-claude-style/assets/2d4bd629514d.svg',
  building: '/dsh-claude-style/assets/84bc02d65566.svg',
  error: '/dsh-claude-style/assets/d0b76604f76f.svg',
  happy: '/dsh-claude-style/assets/62647b81453f.svg',
  notification: '/dsh-claude-style/assets/b5c88fffcd08.svg',
  compacting: '/dsh-claude-style/assets/bd48fda92d54.svg',
  sleeping: '/dsh-claude-style/assets/c94f98071b0f.svg',
  waking: '/dsh-claude-style/assets/aee0b9809ae6.svg',
  'poke-left': '/dsh-claude-style/assets/5ff45ccd6396.svg',
  'poke-right': '/dsh-claude-style/assets/6cda22c8c355.svg',
  tickle: '/dsh-claude-style/assets/192fda8da55a.svg',
  drag: '/dsh-claude-style/assets/3b6d7b199795.svg',
};

const WHALE_GIRL_SHEET_URLS: Record<string, string> = {
  idle: '/dsh-claude-style/assets/012cc14e9f0e.png',
  'idle-look': '/dsh-claude-style/assets/737bbc7bac2e.png',
  'idle-spout': '/dsh-claude-style/assets/b523bd91586b.png',
  thinking: '/dsh-claude-style/assets/bbb172bc2d30.png',
  typing: '/dsh-claude-style/assets/667ef769c4cf.png',
  music: '/dsh-claude-style/assets/f78f468b38e7.png',
  conducting: '/dsh-claude-style/assets/6e1d28718c56.png',
  building: '/dsh-claude-style/assets/3584a1cea0ef.png',
  error: '/dsh-claude-style/assets/5ffd3420f353.png',
  happy: '/dsh-claude-style/assets/b75776c4e109.png',
  notification: '/dsh-claude-style/assets/40ad6f7bff18.png',
  compacting: '/dsh-claude-style/assets/2ee5f5c4da8d.png',
  carrying: '/dsh-claude-style/assets/97e74499dffc.png',
  sleeping: '/dsh-claude-style/assets/59c57341b28b.png',
  waking: '/dsh-claude-style/assets/6f19e3c60d66.png',
  'poke-left': '/dsh-claude-style/assets/467d7763b760.png',
  'poke-right': '/dsh-claude-style/assets/9bad6b536520.png',
  tickle: '/dsh-claude-style/assets/61494b8e050c.png',
  drag: '/dsh-claude-style/assets/656baa41eef1.png',
  swim: '/dsh-claude-style/assets/8a2b002872f2.png',
  'smile-hearts': '/dsh-claude-style/assets/e22e8d694fc9.png',
  'thumbs-up': '/dsh-claude-style/assets/f5ab76c06270.png',
};

const CRAB_SHEETS: Record<string, MascotSheet> = {
  idle: { frames: 24, box: [24, 20, 24, 16], still: 0 },
  'idle-look': { frames: 31, box: [24, 20, 24, 16], still: 0 },
  'idle-wave': { frames: 12, box: [24, 15, 24, 21], still: 0 },
  'idle-laptop': { frames: 43, box: [14, 13, 34, 23], still: 0 },
  thinking: { frames: 48, box: [20, 0, 30, 36], still: 24 },
  typing: { frames: 6, box: [15, 22, 28, 14], still: 0 },
  music: { frames: 16, box: [19, 9, 31, 27], still: 0 },
  conducting: { frames: 24, box: [20, 12, 29, 24], still: 0 },
  building: { frames: 6, box: [15, 19, 28, 17], still: 0 },
  error: { frames: 24, box: [23, 11, 26, 25], still: 4 },
  happy: { frames: 32, box: [18, 6, 34, 30], still: 3 },
  notification: { frames: 16, box: [24, 8, 24, 28], still: 0 },
  compacting: { frames: 20, box: [21, 20, 30, 16], still: 3 },
  sleeping: { frames: 32, box: [18, 1, 31, 35], still: 0 },
  waking: { frames: 12, box: [24, 4, 24, 32], still: 11 },
  'poke-left': { frames: 10, box: [24, 20, 27, 16], still: 0 },
  'poke-right': { frames: 10, box: [21, 20, 27, 16], still: 0 },
  tickle: { frames: 16, box: [23, 18, 26, 18], still: 0 },
  drag: { frames: 8, box: [23, 12, 26, 22], still: 0 },
};

const DEEPY_SHEETS: Record<string, MascotSheet> = {
  idle: { frames: 48, box: [12, 26, 36, 24], still: 0 },
  'idle-look': { frames: 68, box: [11, 11, 37, 39], still: 0 },
  'idle-spout': { frames: 64, box: [8, 17, 39, 33], still: 0 },
  thinking: { frames: 48, box: [0, 6, 47, 44], still: 20 },
  typing: { frames: 48, box: [0, 17, 52, 33], still: 16 },
  music: { frames: 32, box: [2, 10, 48, 40], still: 0 },
  conducting: { frames: 48, box: [1, 0, 51, 50], still: 6 },
  building: { frames: 48, box: [2, 0, 50, 50], still: 0 },
  error: { frames: 48, box: [4, 17, 45, 33], still: 24 },
  happy: { frames: 52, box: [0, 5, 52, 45], still: 44 },
  notification: { frames: 32, box: [3, 7, 47, 43], still: 12 },
  compacting: { frames: 56, box: [2, 14, 46, 36], still: 20 },
  sleeping: { frames: 64, box: [2, 2, 44, 48], still: 10 },
  waking: { frames: 30, box: [8, 4, 44, 46], still: 29 },
  'poke-left': { frames: 40, box: [1, 16, 50, 34], still: 0 },
  'poke-right': { frames: 40, box: [8, 16, 44, 34], still: 0 },
  tickle: { frames: 48, box: [9, 17, 43, 33], still: 0 },
  drag: { frames: 24, box: [10, 4, 41, 46], still: 0 },
};

const WHALE_GIRL_SHEETS: Record<string, MascotSheet> = {
  idle: { frames: 21, box: [0, 0, 69, 66], still: 0, columns: 21, durs: [700, 280, 280, 240, 360, 60, 90, 60, 650, 280, 280, 240, 420, 60, 80, 60, 140, 60, 80, 60, 800] },
  'idle-look': { frames: 13, box: [0, 0, 69, 66], still: 0, columns: 13, durs: [500, 420, 70, 80, 70, 380, 420, 110, 420, 140, 140, 140, 400] },
  'idle-spout': { frames: 11, box: [0, 0, 69, 66], still: 0, columns: 11, durs: [450, 260, 110, 110, 130, 150, 170, 170, 170, 350, 400] },
  thinking: { frames: 17, box: [0, 0, 69, 66], still: 0, columns: 17, durs: [220, 220, 260, 260, 260, 300, 170, 170, 170, 170, 170, 170, 90, 110, 200, 200, 260] },
  typing: { frames: 14, box: [0, 0, 69, 66], still: 0, columns: 14, durs: [150, 170, 150, 170, 150, 170, 210, 150, 170, 150, 170, 150, 170, 210] },
  music: { frames: 8, box: [0, 0, 69, 66], still: 0, columns: 8, durs: [150, 150, 150, 150, 150, 150, 150, 150] },
  conducting: { frames: 12, box: [0, 0, 69, 66], still: 0, columns: 12, durs: [150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150] },
  building: { frames: 24, box: [0, 0, 69, 66], still: 0, columns: 24, durs: [130, 100, 80, 90, 100, 120, 90, 130, 130, 100, 80, 90, 100, 120, 90, 130, 130, 100, 80, 90, 100, 120, 90, 130] },
  error: { frames: 10, box: [0, 0, 69, 66], still: 0, columns: 10, durs: [90, 80, 80, 80, 90, 200, 200, 160, 200, 300] },
  happy: { frames: 11, box: [0, 0, 69, 66], still: 0, columns: 11, durs: [200, 90, 90, 100, 100, 100, 100, 110, 110, 120, 400] },
  notification: { frames: 8, box: [0, 0, 69, 66], still: 0, columns: 8, durs: [110, 110, 110, 110, 110, 110, 110, 110] },
  compacting: { frames: 10, box: [0, 0, 69, 66], still: 0, columns: 10, durs: [300, 130, 130, 130, 130, 200, 100, 160, 220, 240] },
  sleeping: { frames: 6, box: [0, 0, 69, 66], still: 0, columns: 6, durs: [330, 330, 330, 330, 330, 330] },
  waking: { frames: 11, box: [0, 0, 69, 66], still: 0, columns: 11, durs: [420, 110, 120, 100, 100, 110, 200, 70, 80, 70, 500] },
  'poke-left': { frames: 11, box: [0, 0, 69, 66], still: 0, columns: 11, durs: [300, 110, 90, 90, 200, 140, 140, 240, 200, 200, 400] },
  'poke-right': { frames: 11, box: [0, 0, 69, 66], still: 0, columns: 11, durs: [300, 110, 90, 90, 200, 140, 140, 240, 200, 200, 400] },
  tickle: { frames: 14, box: [0, 0, 69, 66], still: 0, columns: 14, durs: [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 200, 400] },
  drag: { frames: 10, box: [0, 0, 69, 66], still: 0, columns: 10, durs: [90, 90, 90, 90, 90, 90, 90, 90, 90, 90] },
};

export interface MascotProps {
  character: MascotCharacter;
  place?: 'card' | 'stack' | 'panel';
  sessionPhase?: 'idle' | 'thinking' | 'working' | 'juggling' | 'sweeping' | 'notification';
  moment?: 'error' | 'attention' | null;
  reducedMotion?: boolean;
  balanceLabel?: string;
}

export const Mascot: React.FC<MascotProps> = ({
  character,
  sessionPhase = 'idle',
  moment = null,
  reducedMotion = false,
  balanceLabel = 'CNY 248.60',
}) => {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const stripRef = useRef<HTMLSpanElement | null>(null);
  const animRef = useRef<Animation | null>(null);
  const clickTimestampsRef = useRef<number[]>([]);
  const dragStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const [pointerState, setPointerState] = useState<MascotAnimKey | null>(null);
  const [ambientState, setAmbientState] = useState<MascotAnimKey>('idle');
  const [bubbleOpen, setBubbleOpen] = useState(false);

  // Ambient idle extras (idle-look, idle-wave / idle-spout, idle-laptop)
  useEffect(() => {
    if (reducedMotion || sessionPhase !== 'idle' || pointerState) {
      setAmbientState('idle');
      return;
    }
    const timer = setInterval(() => {
      const r = Math.random();
      if (r < 0.35) {
        setAmbientState('idle-look');
        setTimeout(() => setAmbientState('idle'), 2400);
      } else if (r < 0.65) {
        setAmbientState(character === 'crab' ? 'idle-wave' : 'idle-spout');
        setTimeout(() => setAmbientState('idle'), 1800);
      } else if (r < 0.85 && character === 'crab') {
        setAmbientState('idle-laptop');
        setTimeout(() => setAmbientState('idle'), 3400);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [reducedMotion, sessionPhase, pointerState, character]);

  const mappedPhaseKey: MascotAnimKey =
    sessionPhase === 'working'
      ? 'typing'
      : sessionPhase === 'juggling'
        ? 'conducting'
        : sessionPhase === 'sweeping'
          ? 'compacting'
          : sessionPhase === 'thinking'
            ? 'thinking'
            : sessionPhase === 'notification'
              ? 'notification'
              : 'idle';

  const effectiveKey: MascotAnimKey = reducedMotion
    ? 'idle'
    : pointerState
      ? pointerState
      : moment === 'error'
        ? 'error'
        : moment === 'attention'
          ? 'happy'
          : mappedPhaseKey !== 'idle'
            ? mappedPhaseKey
            : ambientState;

  useEffect(() => {
    const root = rootRef.current;
    const strip = stripRef.current;
    if (!root || !strip || character === 'off') return;

    const sheetTable =
      character === 'crab'
        ? CRAB_SHEETS
        : character === 'deepy'
          ? DEEPY_SHEETS
          : WHALE_GIRL_SHEETS;
    const sheet = sheetTable[effectiveKey] || sheetTable.idle;
    const gutter = character === 'whalegirl' ? 0 : 1;
    const baseFrameMs = character === 'deepy' ? 50 : character === 'crab' ? 80 : 100;

    const cellW = sheet.box[2] + gutter * 2;
    const cellH = sheet.box[3] + gutter * 2;
    const cols = sheet.columns ?? 8;
    const stripH = cellH * Math.ceil(sheet.frames / cols);

    root.style.setProperty('--dsh-claude-mascot-x', String(sheet.box[0]));
    root.style.setProperty('--dsh-claude-mascot-y', String(sheet.box[1]));
    root.style.setProperty('--dsh-claude-mascot-w', String(sheet.box[2]));
    root.style.setProperty('--dsh-claude-mascot-h', String(sheet.box[3]));
    root.style.setProperty('--dsh-claude-mascot-cell-w', String(cellW));
    root.style.setProperty('--dsh-claude-mascot-columns', String(cols));
    root.style.setProperty('--dsh-claude-mascot-strip-h', String(stripH));

    if (character === 'crab') {
      const urls = CRAB_URLS[effectiveKey] || CRAB_URLS.idle;
      root.style.setProperty('--dsh-claude-mascot-sheet', `url("${urls.body}")`);
      root.style.setProperty('--dsh-claude-crab-ink', `url("${urls.ink}")`);
    } else if (character === 'deepy') {
      const url = DEEPY_SHEET_URLS[effectiveKey] || DEEPY_SHEET_URLS.idle;
      root.style.setProperty('--dsh-claude-mascot-sheet', `url("${url}")`);
    } else {
      const url = WHALE_GIRL_SHEET_URLS[effectiveKey] || WHALE_GIRL_SHEET_URLS.idle;
      root.style.setProperty('--dsh-claude-mascot-sheet', `url("${url}")`);
    }

    const frameOffset = (frame: number) =>
      `translate(${-((frame % cols) * cellW + gutter) * 2}px, ${-(Math.floor(frame / cols) * cellH + gutter) * 2}px)`;

    if (animRef.current) {
      animRef.current.cancel();
      animRef.current = null;
    }

    if (reducedMotion) {
      strip.style.transform = frameOffset(sheet.still);
      return;
    }

    strip.style.transform = '';
    const keyframes: Keyframe[] = [];
    let duration = 0;

    if (!sheet.durs) {
      duration = sheet.frames * baseFrameMs;
      for (let f = 0; f < sheet.frames; f++) {
        keyframes.push({
          offset: f / sheet.frames,
          transform: frameOffset(f),
          easing: 'steps(1)',
        });
      }
    } else {
      duration = sheet.durs.reduce((s, d) => s + d, 0);
      let at = 0;
      for (let f = 0; f < sheet.frames; f++) {
        keyframes.push({
          offset: at / duration,
          transform: frameOffset(f),
          easing: 'steps(1)',
        });
        at += sheet.durs[f];
      }
    }

    const isOnce =
      effectiveKey === 'poke-left' ||
      effectiveKey === 'poke-right' ||
      effectiveKey === 'tickle' ||
      effectiveKey === 'happy';

    keyframes.push({
      offset: 1,
      transform: frameOffset(isOnce ? sheet.frames - 1 : 0),
    });

    const anim = strip.animate(keyframes, {
      duration,
      iterations: isOnce ? 1 : Infinity,
      fill: 'forwards',
    });
    animRef.current = anim;

    if (isOnce) {
      anim.onfinish = () => setPointerState(null);
    }

    return () => {
      anim.cancel();
    };
  }, [character, effectiveKey, reducedMotion]);

  if (character === 'off') return null;

  const name = character;

  const handlePointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY, active: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    const d = dragStartRef.current;
    if (!d) return;
    if (!d.active && Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 4) {
      d.active = true;
      setPointerState('drag');
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
    const d = dragStartRef.current;
    dragStartRef.current = null;
    if (d?.active) {
      setPointerState('happy');
      return;
    }
    const now = performance.now();
    const recent = clickTimestampsRef.current.filter((t) => now - t < 450);
    recent.push(now);
    clickTimestampsRef.current = recent;

    if (recent.length >= 4) {
      clickTimestampsRef.current = [];
      setPointerState('tickle');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setPointerState(e.clientX - rect.left < rect.width / 2 ? 'poke-left' : 'poke-right');
  };

  return (
    <span
      ref={rootRef}
      className={`dsh-claude-${name}`}
      data-ready=""
      data-animation={effectiveKey}
      aria-hidden="true"
    >
      <span className={`dsh-claude-${name}-sprite`}>
        <span ref={stripRef} className={`dsh-claude-${name}-strip`} />
      </span>
      <span
        className={`dsh-claude-${name}-hit`}
        onMouseEnter={() => setBubbleOpen(true)}
        onMouseLeave={() => setBubbleOpen(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span
          className={`dsh-claude-mascot-bubble${bubbleOpen ? ' is-open' : ''}`}
          data-open={bubbleOpen ? '' : undefined}
        >
          <span className="dsh-claude-mascot-bubble-value">{balanceLabel}</span>
        </span>
      </span>
    </span>
  );
};
