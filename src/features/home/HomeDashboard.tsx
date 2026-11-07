import React, { useState } from 'react';
import type { HomeLayoutMode, UsageDashboardData } from '../../types';
import { formatCompactTokens } from '../context/ContextMeter';

export interface HomeDashboardProps {
  displayName: string;
  brand: 'claude' | 'deepseek';
  homeLayout: HomeLayoutMode;
  dashboard: UsageDashboardData;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return '早上好';
  if (h >= 12 && h < 18) return '下午好';
  if (h >= 18 && h < 22) return '晚上好';
  return '晚安';
}

function axisMax(peak: number) {
  if (!(peak > 0)) return 60_000_000;
  const magnitude = Math.pow(10, Math.floor(Math.log(peak) / Math.LN10));
  const scaled = peak / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

const DEEPSEEK_WHALE_PATH =
  'M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308z';

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  displayName,
  brand,
  homeLayout,
  dashboard,
}) => {
  const [tab, setTab] = useState<'overview' | 'models'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'models' ? 'models' : 'overview';
  });
  const [range, setRange] = useState<'all' | 'd30' | 'd7'>('all');

  const activeRangeData = dashboard[range] || dashboard.all;
  const greeting = `${getTimeGreeting()}，${displayName}`;

  if (homeLayout === 'classic' || homeLayout === 'off') {
    return (
      <div className="omp-home-classic">
        <div className="omp-classic-greeting">
          <span className={`omp-brand-glyph is-${brand}`} aria-hidden="true">
            {brand === 'claude' ? (
              <span
                className="dsh-claude-masked-mark"
                style={{
                  width: 34,
                  height: 34,
                  backgroundColor: 'var(--omp-accent)',
                  display: 'inline-block',
                }}
              />
            ) : (
              <svg viewBox="0 0 24 22" width="34" height="31" fill="currentColor">
                <path d={DEEPSEEK_WHALE_PATH} />
              </svg>
            )}
          </span>
          <h1 className="omp-classic-headline">{greeting}</h1>
        </div>
      </div>
    );
  }

  const chartTop = axisMax(dashboard.dailyModels.peak);
  const gridLevels = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="omp-home-studio">
      <div className="omp-studio-headline">
        <span className={`omp-brand-glyph is-${brand}`} aria-hidden="true">
          {brand === 'claude' ? (
            <span
              className="dsh-claude-masked-mark"
              style={{
                width: 20,
                height: 20,
                backgroundColor: 'var(--omp-accent)',
                display: 'inline-block',
              }}
            />
          ) : (
            <svg viewBox="0 0 24 22" width="22" height="20" fill="currentColor">
              <path d={DEEPSEEK_WHALE_PATH} />
            </svg>
          )}
        </span>
        <span className="omp-studio-greeting-text">{greeting}</span>
      </div>

      <div className="dsh-claude-home-panel">
        <div className="dsh-claude-home-panel-head dsh-claude-home-bar">
          <div className="dsh-claude-home-tabs">
            <button
              type="button"
              className={`dsh-claude-home-tab${tab === 'overview' ? ' is-active' : ''}`}
              data-active={tab === 'overview' ? '' : undefined}
              onClick={() => setTab('overview')}
            >
              概览
            </button>
            <button
              type="button"
              className={`dsh-claude-home-tab${tab === 'models' ? ' is-active' : ''}`}
              data-active={tab === 'models' ? '' : undefined}
              onClick={() => setTab('models')}
            >
              模型
            </button>
          </div>

          <div className="dsh-claude-home-ranges">
            <button
              type="button"
              className={`dsh-claude-home-range${range === 'all' ? ' is-active' : ''}`}
              data-active={range === 'all' ? '' : undefined}
              onClick={() => setRange('all')}
            >
              全部
            </button>
            <button
              type="button"
              className={`dsh-claude-home-range${range === 'd30' ? ' is-active' : ''}`}
              data-active={range === 'd30' ? '' : undefined}
              onClick={() => setRange('d30')}
            >
              30天
            </button>
            <button
              type="button"
              className={`dsh-claude-home-range${range === 'd7' ? ' is-active' : ''}`}
              data-active={range === 'd7' ? '' : undefined}
              onClick={() => setRange('d7')}
            >
              7天
            </button>
          </div>
        </div>

        {tab === 'overview' ? (
          <div className="dsh-claude-home-overview-body">
            <div className="dsh-claude-home-stats">
              <div className="dsh-claude-home-stat">
                <div className="dsh-claude-home-stat-label">对话</div>
                <div className="dsh-claude-home-stat-value dsh-claude-home-stat-val">
                  {activeRangeData.sessionsCount.toLocaleString()}
                </div>
              </div>
              <div className="dsh-claude-home-stat">
                <div className="dsh-claude-home-stat-label">消息</div>
                <div className="dsh-claude-home-stat-value dsh-claude-home-stat-val">
                  {activeRangeData.messagesCount.toLocaleString()}
                </div>
              </div>
              <div className="dsh-claude-home-stat">
                <div className="dsh-claude-home-stat-label">总 Token</div>
                <div className="dsh-claude-home-stat-value dsh-claude-home-stat-val">
                  {formatCompactTokens(activeRangeData.totalTokens)}
                </div>
              </div>
              <div className="dsh-claude-home-stat">
                <div className="dsh-claude-home-stat-label">活跃天数</div>
                <div className="dsh-claude-home-stat-value dsh-claude-home-stat-val">
                  {activeRangeData.activeDays}
                </div>
              </div>
              <div className="dsh-claude-home-stat">
                <div className="dsh-claude-home-stat-label">高峰时段</div>
                <div className="dsh-claude-home-stat-value dsh-claude-home-stat-val">
                  {String(activeRangeData.peakHour).padStart(2, '0')}:00
                </div>
              </div>
              <div className="dsh-claude-home-stat" data-stat="model">
                <div className="dsh-claude-home-stat-label">最常用模型</div>
                <div className="dsh-claude-home-stat-value dsh-claude-home-stat-val is-model">
                  {activeRangeData.favoriteModel}
                </div>
              </div>
            </div>

            <div className="dsh-claude-home-heat" role="grid" aria-label="26周活跃热力图">
              {dashboard.heatGrid.cells.map((cell) => (
                <span
                  key={cell.date}
                  className="dsh-claude-home-heat-cell"
                  data-level={cell.level}
                  title={`${cell.date} · ${formatCompactTokens(cell.tokens)} tokens`}
                />
              ))}
            </div>

            <div className="dsh-claude-home-foot">
              <span className="dsh-claude-home-fun">
                {activeRangeData.yardstickBookZh || '相当于读完 3,556 遍《三国演义》'}
              </span>
              <span className="dsh-claude-home-legend">
                <span>少</span>
                {[0, 1, 2, 3, 4].map((lv) => (
                  <i key={lv} className="dsh-claude-home-heat-cell is-legend" data-level={lv} />
                ))}
                <span>多</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="dsh-claude-home-models-body">
            <div className="dsh-claude-home-chart">
              <div className="dsh-claude-home-chart-y">
                {gridLevels.map((lv) => (
                  <span key={lv} className="dsh-claude-home-chart-ylabel">
                    {lv === 0 ? '0' : formatCompactTokens(chartTop * lv)}
                  </span>
                ))}
              </div>
              <div className="dsh-claude-home-chart-plot">
                {gridLevels.map((lv) => (
                  <div
                    key={lv}
                    className="dsh-claude-home-chart-gridline"
                    style={{ bottom: `${lv * 100}%` }}
                  />
                ))}
                <div className="dsh-claude-home-chart-bars">
                  {dashboard.dailyModels.days.map((day) => {
                    const colHeight = chartTop > 0 ? Math.min(100, (day.total / chartTop) * 100) : 0;
                    return (
                      <div
                        key={day.date}
                        className="dsh-claude-home-chart-col"
                        title={`${day.date} · ${formatCompactTokens(day.total)} tokens`}
                      >
                        <div
                          className="dsh-claude-home-chart-stack"
                          style={{ height: `${colHeight}%` }}
                        >
                          {day.slices.map((s) => {
                            const segH = day.total > 0 ? (s.tokens / day.total) * 100 : 0;
                            return (
                              <span
                                key={s.model}
                                className="dsh-claude-home-chart-seg"
                                data-rank={s.rank}
                                style={{ height: `${segH}%` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="dsh-claude-home-model-list">
              {activeRangeData.modelBreakdown.map((item, idx) => (
                <div key={item.model} className="dsh-claude-home-model-row">
                  <span className="dsh-claude-home-model-dot" data-rank={idx} />
                  <span className="dsh-claude-home-model-name">{item.model}</span>
                  <span className="dsh-claude-home-model-tokens">
                    {formatCompactTokens(item.totalTokens)}
                  </span>
                  <span className="dsh-claude-home-model-share">{item.share.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
