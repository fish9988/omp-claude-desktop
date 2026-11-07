import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ModelCatalogItem } from '../../types';
import vendorLockupsRaw from '../../theme/vendor-lockups.json';

const VENDOR_LOCKUPS = vendorLockupsRaw as Record<string, string>;

function detectVendorKey(model: ModelCatalogItem): string {
  const id = model.id.toLowerCase();
  const prov = model.provider.toLowerCase();
  if (id.includes('claude') || prov.includes('anthropic')) return 'claude';
  if (id.includes('deepseek') || prov.includes('deepseek')) return 'deepseek';
  if (id.includes('gemini') || prov.includes('gemini')) return 'gemini';
  if (id.includes('gpt') || id.includes('o1') || id.includes('o3') || prov.includes('oai')) return 'openai';
  if (id.includes('qwen')) return 'qwen';
  if (id.includes('kimi')) return 'kimi';
  if (id.includes('minimax')) return 'minimax';
  if (id.includes('grok')) return 'grok';
  return 'claude';
}

function formatCtxWindow(tokens: number): string {
  if (!tokens) return '200K';
  if (tokens >= 1_000_000) return `${Math.round(tokens / 1_000_000)}M`;
  return `${Math.round(tokens / 1_000)}K`;
}

export interface ModelPickerProps {
  models: ModelCatalogItem[];
  value: string;
  onChange: (modelId: string) => void;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({ models, value, onChange }) => {
  const [open, setOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('popover') === 'model';
  });
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const currentModel = models.find((m) => m.id === value) || models[0];

  const groupedModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = new Map<string, { vendorKey: string; providerLabel: string; items: ModelCatalogItem[] }>();
    for (const m of models) {
      if (
        q &&
        !m.id.toLowerCase().includes(q) &&
        !m.name.toLowerCase().includes(q) &&
        !(m.description || '').toLowerCase().includes(q) &&
        !m.provider.toLowerCase().includes(q)
      ) {
        continue;
      }
      const vKey = detectVendorKey(m);
      const groupKey = `${vKey}:${m.provider}`;
      const existing = groups.get(groupKey);
      if (existing) {
        existing.items.push(m);
      } else {
        groups.set(groupKey, { vendorKey: vKey, providerLabel: m.provider, items: [m] });
      }
    }
    return Array.from(groups.values());
  }, [models, query]);

  return (
    <div className="omp-model-picker-anchor" ref={wrapRef}>
      <button
        type="button"
        className="dsh-claude-model-btn omp-model-trigger"
        onClick={() => setOpen((v) => !v)}
        title="切换模型 (支持 OMP models.yml 全部渠道)"
      >
        <span className="dsh-claude-model-btn-label omp-model-trigger-name">
          {currentModel?.name || currentModel?.id || value}
        </span>
        {currentModel?.peakRateStatus && (
          <span
            className={`omp-peak-badge is-${currentModel.peakRateStatus}`}
            title={currentModel.peakRateLabel || ''}
          >
            {currentModel.peakRateStatus === 'valley' ? '优惠' : '高峰'}
          </span>
        )}
      </button>

      {open && (
        <div className="omp-model-popover">
          <div className="omp-model-search-row">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L13.5 13.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className="omp-model-search-input"
              placeholder="搜索模型名称或提供商…"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="omp-model-groups">
            {groupedModels.map((grp) => {
              const lockupSvg = VENDOR_LOCKUPS[grp.vendorKey];
              return (
                <div key={grp.providerLabel + grp.vendorKey} className="omp-model-group">
                  <div className="omp-model-group-head">
                    {lockupSvg ? (
                      <span
                        className="dsh-claude-vendor-lockup"
                        dangerouslySetInnerHTML={{ __html: lockupSvg }}
                      />
                    ) : (
                      <span>{grp.providerLabel}</span>
                    )}
                    <span className="omp-model-group-tag">{grp.providerLabel}</span>
                  </div>

                  {grp.items.map((item) => {
                    const selected = item.id === value;
                    return (
                      <button
                        key={`${item.provider}-${item.id}`}
                        type="button"
                        className={`omp-model-option${selected ? ' is-selected' : ''}`}
                        onClick={() => {
                          onChange(item.id);
                          setOpen(false);
                        }}
                      >
                        <div className="omp-model-option-top">
                          <span className="omp-model-option-id">{item.id}</span>
                          <div className="omp-model-option-badges">
                            {item.reasoning && (
                              <span className="omp-model-tag is-reasoning">思考</span>
                            )}
                            <span className="omp-model-tag">
                              {formatCtxWindow(item.contextWindow)}
                            </span>
                            {selected && <span className="omp-model-check">✓</span>}
                          </div>
                        </div>
                        {item.description && (
                          <div className="omp-model-option-desc">{item.description}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
