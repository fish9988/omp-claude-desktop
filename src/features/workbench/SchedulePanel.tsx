import React, { useEffect, useState } from 'react';

interface ScheduledJob {
  id: string;
  title: string;
  prompt: string;
  cronLabel: string;
  intervalMinutes: number;
  cwd: string;
  active: boolean;
  lastRunAt: number | null;
  nextRunAt: number;
}

export const SchedulePanel = ({
  cwd,
  onRunActivatedSession,
}: {
  cwd: string;
  onRunActivatedSession?: (sessionId: string) => void;
}) => {
  const [schedules, setSchedules] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [cronLabel, setCronLabel] = useState('每日 09:00');
  const [intervalMinutes, setIntervalMinutes] = useState(1440);
  const [runningId, setRunningId] = useState<string | null>(null);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schedules');
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (e) {
      console.error('Failed to load schedules:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleToggle = async (job: ScheduledJob) => {
    try {
      const res = await fetch(`/api/schedules/${encodeURIComponent(job.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !job.active }),
      });
      const data = await res.json();
      if (data.schedule) {
        setSchedules((prev) => prev.map((s) => (s.id === job.id ? data.schedule : s)));
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    try {
      const res = await fetch(`/api/schedules/${encodeURIComponent(id)}/run`, { method: 'POST' });
      const data = await res.json();
      await loadSchedules();
      if (data.sessionId && onRunActivatedSession) {
        onRunActivatedSession(data.sessionId);
      }
    } catch {}
    setRunningId(null);
  };

  const handleCreate = async () => {
    if (!title.trim() || !prompt.trim()) return;
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          prompt: prompt.trim(),
          cronLabel,
          intervalMinutes,
          cwd,
        }),
      });
      const data = await res.json();
      if (data.schedule) {
        setSchedules((prev) => [data.schedule, ...prev]);
        setTitle('');
        setPrompt('');
        setCreating(false);
      }
    } catch {}
  };

  return (
    <div className="omp-wb-section">
      <div className="omp-wb-toolbar">
        <span className="omp-wb-meta">DSH / OMP 自动化定时巡检任务 ({schedules.length})</span>
        <button
          type="button"
          className="omp-wb-btn is-primary"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? '取消' : '+ 新建任务'}
        </button>
      </div>

      {creating && (
        <div className="omp-wb-card" style={{ marginBottom: 10 }}>
          <input
            type="text"
            className="omp-wb-input"
            placeholder="任务名称 (例如：每日 Git 状态巡检)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="omp-wb-textarea"
            placeholder="自动执行的 Prompt 指令…"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              className="omp-wb-input"
              value={intervalMinutes}
              onChange={(e) => {
                const mins = Number(e.target.value);
                setIntervalMinutes(mins);
                setCronLabel(
                  mins === 60 ? '每小时' : mins === 360 ? '每 6 小时' : mins === 1440 ? '每日 09:00' : '每周一 09:00'
                );
              }}
            >
              <option value={60}>每小时 (60m)</option>
              <option value={360}>每 6 小时 (360m)</option>
              <option value={1440}>每日一次 (24h)</option>
              <option value={10080}>每周一次 (7d)</option>
            </select>
            <button type="button" className="omp-wb-btn is-primary" onClick={handleCreate}>
              保存任务
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="omp-loading">加载定时任务中…</div>
      ) : (
        <div className="omp-wb-list">
          {schedules.map((job) => (
            <div key={job.id} className="omp-wb-card">
              <div className="omp-wb-card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    className={`omp-status-dot ${job.active ? 'is-on' : 'is-off'}`}
                    title={job.active ? '已启用' : '已暂停'}
                  />
                  <strong style={{ fontSize: 12.5 }}>{job.title}</strong>
                </div>
                <span className="omp-wb-badge">{job.cronLabel}</span>
              </div>
              <div className="omp-wb-card-desc">{job.prompt}</div>
              <div className="omp-wb-card-foot">
                <span className="omp-wb-meta">
                  {job.lastRunAt
                    ? `上次运行: ${new Date(job.lastRunAt).toLocaleTimeString()}`
                    : '尚未运行'}
                </span>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    type="button"
                    className="omp-wb-btn"
                    disabled={runningId === job.id}
                    onClick={() => handleRunNow(job.id)}
                  >
                    {runningId === job.id ? '触发中…' : '立即运行'}
                  </button>
                  <button
                    type="button"
                    className="omp-wb-btn"
                    onClick={() => handleToggle(job)}
                  >
                    {job.active ? '暂停' : '启用'}
                  </button>
                  <button
                    type="button"
                    className="omp-wb-btn is-danger"
                    onClick={() => handleDelete(job.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
