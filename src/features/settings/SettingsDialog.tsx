import React, { useEffect, useState } from 'react';
import type { AppSettings } from '../../types';

export interface SettingsDialogProps {
  open: boolean;
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  settings,
  onUpdate,
  onClose,
}) => {
  const [fonts, setFonts] = useState<string[]>([
    'Anthropic Serif',
    'Anthropic Sans',
    'Anthropic Mono',
    'Inter',
    'Noto Serif',
    'JetBrains Mono',
    'Claude Style Pixel',
    'Microsoft YaHei',
    'Consolas',
  ]);
  const [fontFilter, setFontFilter] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch('/api/fonts')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.fonts)) setFonts(d.fonts);
      })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const filteredFonts = fontFilter.trim()
    ? fonts.filter((f) => f.toLowerCase().includes(fontFilter.trim().toLowerCase()))
    : fonts;

  const applyBrandPreset = (brand: 'claude' | 'deepseek') => {
    if (brand === 'claude') {
      onUpdate({
        brand: 'claude',
        palette: 'claude',
        mascot: 'crab',
        uiFont: 'Anthropic Sans',
        serifFont: 'Anthropic Serif',
        codeFont: 'Anthropic Mono',
      });
    } else {
      onUpdate({
        brand: 'deepseek',
        palette: 'deepseek',
        mascot: 'deepy',
        uiFont: 'Inter',
        serifFont: 'Noto Serif',
        codeFont: 'JetBrains Mono',
      });
    }
  };

  return (
    <div className="dsh-claude-modal-backdrop" onMouseDown={onClose}>
      <div className="dsh-claude-settings-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dsh-claude-settings-head">
          <div>
            <div className="dsh-claude-settings-title">Claude Style · 外观与行为设置</div>
            <div className="dsh-claude-settings-sub">
              1:1 复刻 Nwflower/dsh-claude-style 视觉令牌、精灵表与交互系统
            </div>
          </div>
          <button type="button" className="dsh-claude-settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="dsh-claude-settings-body">
          {/* Brand Preset */}
          <section className="dsh-claude-settings-sec">
            <div className="dsh-claude-settings-sec-title">品牌预设 (Brand Preset)</div>
            <div className="dsh-claude-settings-cards">
              <button
                type="button"
                className={`dsh-claude-preset-card${settings.brand === 'claude' ? ' is-active' : ''}`}
                onClick={() => applyBrandPreset('claude')}
              >
                <span className="dsh-claude-preset-swatch" style={{ background: '#d97757' }} />
                <div className="dsh-claude-preset-info">
                  <b>Claude 经典暖纸</b>
                  <span>赤陶 #d97757 · Anthropic Serif · 像素小螃蟹 Clawd</span>
                </div>
              </button>

              <button
                type="button"
                className={`dsh-claude-preset-card${settings.brand === 'deepseek' ? ' is-active' : ''}`}
                onClick={() => applyBrandPreset('deepseek')}
              >
                <span className="dsh-claude-preset-swatch" style={{ background: '#4d6bfe' }} />
                <div className="dsh-claude-preset-info">
                  <b>DeepSeek 冷白/深海蓝</b>
                  <span>钴蓝 #4d6bfe · Inter 无衬线 · 矢量小鲸鱼 Deepy</span>
                </div>
              </button>
            </div>
          </section>

          {/* Scheme & Palette */}
          <section className="dsh-claude-settings-sec">
            <div className="dsh-claude-settings-sec-title">明暗模式与色板 (Scheme & Palette)</div>
            <div className="dsh-claude-settings-row">
              <span>外观明暗</span>
              <div className="dsh-claude-seg-group">
                {(['light', 'dark', 'system'] as const).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    className={`dsh-claude-seg-btn${settings.scheme === sc ? ' is-active' : ''}`}
                    onClick={() => onUpdate({ scheme: sc })}
                  >
                    {sc === 'light' ? '浅色' : sc === 'dark' ? '深色' : '跟随系统'}
                  </button>
                ))}
              </div>
            </div>

            <div className="dsh-claude-settings-row">
              <span>色板模式</span>
              <div className="dsh-claude-seg-group">
                {(['claude', 'deepseek', 'custom'] as const).map((pal) => (
                  <button
                    key={pal}
                    type="button"
                    className={`dsh-claude-seg-btn${settings.palette === pal ? ' is-active' : ''}`}
                    onClick={() => onUpdate({ palette: pal })}
                  >
                    {pal === 'claude' ? 'Claude' : pal === 'deepseek' ? 'DeepSeek' : '自定义种子色'}
                  </button>
                ))}
              </div>
            </div>

            {settings.palette === 'custom' && (
              <div className="dsh-claude-custom-seeds">
                <label className="dsh-claude-seed-item">
                  <span>品牌强调色 (Accent)</span>
                  <input
                    type="color"
                    value={settings.customSeeds.accent}
                    onChange={(e) =>
                      onUpdate({
                        customSeeds: { ...settings.customSeeds, accent: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="dsh-claude-seed-item">
                  <span>浅色画布 (Canvas Light)</span>
                  <input
                    type="color"
                    value={settings.customSeeds.canvasLight}
                    onChange={(e) =>
                      onUpdate({
                        customSeeds: { ...settings.customSeeds, canvasLight: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="dsh-claude-seed-item">
                  <span>深色画布 (Canvas Dark)</span>
                  <input
                    type="color"
                    value={settings.customSeeds.canvasDark}
                    onChange={(e) =>
                      onUpdate({
                        customSeeds: { ...settings.customSeeds, canvasDark: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            )}
          </section>

          {/* Home Layout & Mascot */}
          <section className="dsh-claude-settings-sec">
            <div className="dsh-claude-settings-sec-title">首页布局与桌宠伙伴 (Home & Mascot)</div>
            <div className="dsh-claude-settings-row">
              <span>首页布局</span>
              <div className="dsh-claude-seg-group">
                {(['studio', 'classic', 'off'] as const).map((hl) => (
                  <button
                    key={hl}
                    type="button"
                    className={`dsh-claude-seg-btn${settings.homeLayout === hl ? ' is-active' : ''}`}
                    onClick={() => onUpdate({ homeLayout: hl })}
                  >
                    {hl === 'studio' ? 'Studio 用量工作台' : hl === 'classic' ? 'Classic 经典居中' : '极简'}
                  </button>
                ))}
              </div>
            </div>

            <div className="dsh-claude-settings-row">
              <span>桌宠角色</span>
              <div className="dsh-claude-seg-group">
                {(['crab', 'deepy', 'whalegirl', 'off'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`dsh-claude-seg-btn${settings.mascot === m ? ' is-active' : ''}`}
                    onClick={() => onUpdate({ mascot: m })}
                  >
                    {m === 'crab'
                      ? 'Clawd 螃蟹'
                      : m === 'deepy'
                        ? 'Deepy 小鲸鱼'
                        : m === 'whalegirl'
                          ? 'Whalegirl 鲸娘'
                          : '关闭'}
                  </button>
                ))}
              </div>
            </div>

            <div className="dsh-claude-settings-row">
              <span>过程行样式 (Process Rows)</span>
              <div className="dsh-claude-seg-group">
                {(['column', 'flat'] as const).map((pl) => (
                  <button
                    key={pl}
                    type="button"
                    className={`dsh-claude-seg-btn${settings.processLayout === pl ? ' is-active' : ''}`}
                    onClick={() => onUpdate({ processLayout: pl })}
                  >
                    {pl === 'column' ? 'Column 折叠过程列' : 'Flat 平铺卡片'}
                  </button>
                ))}
              </div>
            </div>

            <div className="dsh-claude-settings-row">
              <span>费用货币符号</span>
              <div className="dsh-claude-seg-group">
                {(['CNY', 'USD', 'off'] as const).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    className={`dsh-claude-seg-btn${settings.billingCurrency === cur ? ' is-active' : ''}`}
                    onClick={() => onUpdate({ billingCurrency: cur })}
                  >
                    {cur === 'CNY' ? 'CNY (¥)' : cur === 'USD' ? 'USD ($)' : '隐藏费用'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Typography & System Font Picker */}
          <section className="dsh-claude-settings-sec">
            <div className="dsh-claude-settings-sec-title">
              字体与排版 (System Fonts · 共检测到 {fonts.length} 款字体)
            </div>
            <div className="dsh-claude-settings-row">
              <span>搜索系统字体</span>
              <input
                type="text"
                className="dsh-claude-font-search"
                placeholder="筛选字体名称 (如 Anthropic, Inter, Microsoft YaHei)..."
                value={fontFilter}
                onChange={(e) => setFontFilter(e.target.value)}
              />
            </div>

            <div className="dsh-claude-settings-row">
              <span>UI 与正文字体</span>
              <select
                className="dsh-claude-font-select"
                value={settings.uiFont}
                onChange={(e) => onUpdate({ uiFont: e.target.value })}
              >
                {filteredFonts.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="dsh-claude-settings-row">
              <span>问候语衬线字体</span>
              <select
                className="dsh-claude-font-select"
                value={settings.serifFont}
                onChange={(e) => onUpdate({ serifFont: e.target.value })}
              >
                {filteredFonts.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="dsh-claude-settings-row">
              <span>代码等宽字体</span>
              <select
                className="dsh-claude-font-select"
                value={settings.codeFont}
                onChange={(e) => onUpdate({ codeFont: e.target.value })}
              >
                {filteredFonts.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Motion & Performance */}
          <section className="dsh-claude-settings-sec">
            <div className="dsh-claude-settings-sec-title">动效与性能加速</div>
            <div className="dsh-claude-settings-row">
              <span>减弱动效 (暂停流光与连续帧动画)</span>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => onUpdate({ reducedMotion: e.target.checked })}
              />
            </div>
            <div className="dsh-claude-settings-row">
              <span>悬停自动展开统计与思考强度卡片</span>
              <input
                type="checkbox"
                checked={settings.openPopoversOnHover}
                onChange={(e) => onUpdate({ openPopoversOnHover: e.target.checked })}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
