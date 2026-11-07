import React, { useEffect, useState } from 'react';

interface GitFile {
  file: string;
  status: string;
  staged: boolean;
  added: number;
  deleted: number;
}

export const GitPanel = ({ cwd }: { cwd: string }) => {
  const [gitStatus, setGitStatus] = useState<{
    isGit: boolean;
    branch: string;
    files: GitFile[];
    diff: string;
  }>({
    isGit: false,
    branch: 'main',
    files: [],
    diff: '',
  });
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGit = async (file?: string) => {
    setLoading(true);
    try {
      const url = `/api/workspace/git?cwd=${encodeURIComponent(cwd)}${
        file ? `&file=${encodeURIComponent(file)}` : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();
      setGitStatus(data);
    } catch (e) {
      console.error('Failed to fetch git status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedFile('');
    fetchGit();
  }, [cwd]);

  const handleAction = async (
    action: 'stage' | 'unstage' | 'stage-all' | 'commit',
    file?: string
  ) => {
    try {
      await fetch('/api/workspace/git-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cwd,
          action,
          file,
          message: commitMessage,
        }),
      });
      if (action === 'commit') setCommitMessage('');
      await fetchGit(selectedFile);
    } catch {}
  };

  if (!gitStatus.isGit && !loading) {
    return <div className="omp-wb-empty">当前目录尚未初始化 Git 仓库。</div>;
  }

  return (
    <div className="omp-wb-section">
      <div className="omp-wb-pathbar">
        <div className="omp-wb-path-crumbs">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="5" cy="4" r="1.6" />
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="11" cy="7" r="1.6" />
            <path d="M5 5.6v4.8M9.4 7H7.2a2.2 2.2 0 0 1-2.2-2.2" strokeLinecap="round" />
          </svg>
          <span className="omp-wb-path-label">{gitStatus.branch || 'main'}</span>
          <span className="omp-wb-badge">{gitStatus.files.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className="omp-wb-pill-btn"
            onClick={() => handleAction('stage-all')}
          >
            全部暂存
          </button>
          <button
            type="button"
            className="omp-wb-icon-btn"
            onClick={() => fetchGit(selectedFile)}
            title="刷新状态"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M13 8a5 5 0 1 1-1.3-3.4M13 3v2.5h-2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="omp-wb-commit-row">
        <input
          type="text"
          className="omp-wb-input"
          placeholder="输入 Commit 提交说明…"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
        <button
          type="button"
          className="omp-wb-pill-btn is-accent"
          disabled={!commitMessage.trim()}
          onClick={() => handleAction('commit')}
        >
          提交
        </button>
      </div>

      {loading ? (
        <div className="omp-wb-empty">正在读取变更状态…</div>
      ) : gitStatus.files.length === 0 ? (
        <div className="omp-wb-empty">工作区干净，暂无未提交变更</div>
      ) : (
        <div className="omp-wb-tree-list" style={{ maxHeight: 200 }}>
          {gitStatus.files.map((f) => (
            <div
              key={f.file}
              className={`omp-wb-row${selectedFile === f.file ? ' is-selected' : ''}`}
              onClick={() => {
                setSelectedFile(f.file);
                fetchGit(f.file);
              }}
            >
              <span className={`omp-git-status is-${f.status}`}>{f.status}</span>
              <span className="omp-wb-row-name">{f.file}</span>
              {(f.added > 0 || f.deleted > 0) && (
                <span className="omp-wb-row-meta">
                  <span style={{ color: '#2b8a3e' }}>+{f.added}</span>{' '}
                  <span style={{ color: '#c92a2a' }}>-{f.deleted}</span>
                </span>
              )}
              <button
                type="button"
                className="omp-wb-hover-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(f.staged ? 'unstage' : 'stage', f.file);
                }}
              >
                {f.staged ? '取消暂存' : '暂存'}
              </button>
            </div>
          ))}
        </div>
      )}

      {gitStatus.diff && (
        <div className="omp-wb-preview-card" style={{ marginTop: 6 }}>
          <div className="omp-wb-preview-head">
            <span className="omp-wb-preview-title">{selectedFile || '工作区 Diff'}</span>
          </div>
          <pre className="omp-wb-code-preview">{gitStatus.diff}</pre>
        </div>
      )}
    </div>
  );
};
