import React, { useEffect, useMemo, useState } from 'react';

interface FileEntry {
  name: string;
  relPath: string;
  isDirectory: boolean;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export const FilePanel = ({
  cwd,
  onInsertReference,
}: {
  cwd: string;
  onInsertReference?: (refText: string) => void;
}) => {
  const [subpath, setSubpath] = useState('');
  const [filter, setFilter] = useState('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<{ relPath: string; content: string } | null>(null);

  useEffect(() => {
    setSubpath('');
    setPreviewFile(null);
  }, [cwd]);

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/workspace/files?cwd=${encodeURIComponent(cwd)}&subpath=${encodeURIComponent(subpath)}`
        );
        const data = await res.json();
        setEntries(data.entries || []);
      } catch (e) {
        console.error('Failed to fetch files:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [cwd, subpath]);

  const filteredEntries = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, filter]);

  const handleOpenEntry = async (entry: FileEntry) => {
    if (entry.isDirectory) {
      setPreviewFile(null);
      setSubpath(entry.relPath);
      return;
    }
    try {
      const res = await fetch(
        `/api/workspace/file?cwd=${encodeURIComponent(cwd)}&path=${encodeURIComponent(entry.relPath)}`
      );
      const data = await res.json();
      setPreviewFile({ relPath: entry.relPath, content: data.content || '' });
    } catch {}
  };

  const handleGoUp = () => {
    setPreviewFile(null);
    if (!subpath) return;
    const parts = subpath.split('/');
    parts.pop();
    setSubpath(parts.join('/'));
  };

  const cwdShort = cwd.split(/[/\\]/).filter(Boolean).pop() || cwd;

  return (
    <div className="omp-wb-section">
      <div className="omp-wb-pathbar">
        <div className="omp-wb-path-crumbs">
          {subpath ? (
            <button type="button" className="omp-wb-icon-btn" onClick={handleGoUp} title="返回上级目录">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 3.5L5.5 8 10 12.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <svg className="omp-wb-root-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.8l1.4 1.5h4.8A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7z" />
            </svg>
          )}
          <span className="omp-wb-path-label" title={cwd}>
            {cwdShort}{subpath ? ` / ${subpath}` : ''}
          </span>
        </div>
        {previewFile && (
          <button type="button" className="omp-wb-pill-btn" onClick={() => setPreviewFile(null)}>
            返回列表
          </button>
        )}
      </div>

      {!previewFile && (
        <div className="omp-wb-search-wrap">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L13.5 13.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className="omp-wb-search-input"
            placeholder="筛选当前目录文件…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      )}

      {previewFile ? (
        <div className="omp-wb-preview-card">
          <div className="omp-wb-preview-head">
            <span className="omp-wb-preview-title">{previewFile.relPath}</span>
            <button
              type="button"
              className="omp-wb-pill-btn is-accent"
              onClick={() => onInsertReference?.(`@${previewFile.relPath} `)}
            >
              + 引用到输入栏
            </button>
          </div>
          <pre className="omp-wb-code-preview">{previewFile.content}</pre>
        </div>
      ) : loading ? (
        <div className="omp-wb-empty">正在读取目录结构…</div>
      ) : filteredEntries.length === 0 ? (
        <div className="omp-wb-empty">无匹配文件</div>
      ) : (
        <div className="omp-wb-tree-list">
          {filteredEntries.map((entry) => (
            <div
              key={entry.relPath}
              className={`omp-wb-row${entry.isDirectory ? ' is-dir' : ' is-file'}`}
              onClick={() => handleOpenEntry(entry)}
            >
              <span className="omp-wb-row-icon">
                {entry.isDirectory ? (
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.35">
                    <path d="M2 4.5A1.3 1.3 0 0 1 3.3 3.2h2.9l1.3 1.5h5.2A1.3 1.3 0 0 1 14 6v5.7a1.3 1.3 0 0 1-1.3 1.3H3.3A1.3 1.3 0 0 1 2 11.7V4.5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.35">
                    <path d="M4 2.2h5.2L12.5 5.5v8.3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.2a1 1 0 0 1 1-1z" />
                    <path d="M9 2.2v3.5h3.5" />
                  </svg>
                )}
              </span>
              <span className="omp-wb-row-name">{entry.name}</span>
              {!entry.isDirectory && entry.size > 0 && (
                <span className="omp-wb-row-meta">{formatFileSize(entry.size)}</span>
              )}
              <button
                type="button"
                className="omp-wb-hover-pill"
                title="引用文件到输入框 (@path)"
                onClick={(e) => {
                  e.stopPropagation();
                  onInsertReference?.(`@${entry.relPath} `);
                }}
              >
                @引用
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
