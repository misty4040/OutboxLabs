import React, { useState } from 'react';
import { Search, RotateCw, Star, AlertCircle } from 'lucide-react';
import { EmailJob } from '../types';

interface ScheduledViewProps {
  jobs: EmailJob[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  onPageChange: (newPage: number) => void;
  onRefresh: () => void;
  onComposeClick: () => void;
}

export const ScheduledView: React.FC<ScheduledViewProps> = ({
  jobs,
  total,
  page,
  totalPages,
  loading,
  error,
  onPageChange,
  onRefresh,
  onComposeClick,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({});

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatScheduledDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      job.recipient.toLowerCase().includes(q) ||
      job.subject.toLowerCase().includes(q) ||
      job.body.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col bg-[#FFFFFF] min-h-full font-sans">
      {/* Editorial Section Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[#D8D2C9] bg-[#FAF8F5]">
        <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#8C867E] block mb-1 font-mono">
          EMAIL OUTREACH
        </span>
        <div className="flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111111] leading-none">
              Scheduled Queue
            </h1>
            <p className="text-xs text-[#5F5A54] mt-2 max-w-xl leading-relaxed">
              Active outbound emails awaiting delayed delivery window via BullMQ worker.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#8C867E]">
              {total} {total === 1 ? 'Job' : 'Jobs'} in queue
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar (Editorial Search + Refresh) */}
      <div className="px-8 py-3.5 border-b border-[#D8D2C9] flex items-center justify-between gap-4 bg-[#FFFFFF]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#8C867E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by recipient or subject..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF8F5] text-[#111111] placeholder-[#8C867E] text-xs border border-[#D8D2C9] focus:bg-[#FFFFFF] focus:border-[#111111] focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh Queue"
            className="p-2 rounded-xl border border-[#D8D2C9] bg-[#FAF8F5] hover:bg-[#EBE7E0] text-[#5F5A54] hover:text-[#111111] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#111111]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="m-6 p-3 rounded-xl bg-[#FBF2EE] border border-[#ECD1C5] text-[#9E3618] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Header Columns (Editorial Minimal) */}
      <div className="hidden sm:grid grid-cols-12 px-8 py-3 border-b border-[#D8D2C9] bg-[#FAF8F5] text-[10px] font-bold text-[#8C867E] uppercase tracking-[0.2em] font-mono">
        <div className="col-span-3">Recipient</div>
        <div className="col-span-5">Subject & Content</div>
        <div className="col-span-2">Scheduled Time</div>
        <div className="col-span-2 text-right">Status</div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#EBE7E0]">
        {loading && jobs.length === 0 ? (
          <div className="p-16 text-center text-[#8C867E] text-xs flex flex-col items-center gap-3">
            <RotateCw className="w-5 h-5 animate-spin text-[#111111]" />
            <span className="font-mono uppercase tracking-wider text-[11px]">Querying BullMQ Queue...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-16 text-center text-[#5F5A54] text-xs space-y-3">
            <p className="font-bold text-[#111111] text-base tracking-tight">NO SCHEDULED EMAILS</p>
            <p className="text-[#8C867E] text-xs max-w-sm mx-auto leading-relaxed">
              Your outbound queue is clear. Schedule an automated campaign with staggered delays.
            </p>
            <button
              onClick={onComposeClick}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#262626] text-[#F4F1EC] font-semibold text-xs transition-colors cursor-pointer border border-[#141414]"
            >
              <span>+ Compose New Email</span>
            </button>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isStarred = starredMap[job.id] || false;
            return (
              <div
                key={job.id}
                className="px-8 py-4 hover:bg-[#FAF8F5] transition-colors text-xs grid grid-cols-1 sm:grid-cols-12 items-center gap-3"
              >
                {/* Column 1: Recipient */}
                <div className="col-span-3 overflow-hidden pr-2">
                  <span className="font-semibold text-[#111111] truncate block">
                    {job.recipient.split('@')[0]}
                  </span>
                  <span className="text-[11px] text-[#8C867E] truncate block font-mono">{job.recipient}</span>
                </div>

                {/* Column 2: Subject & Body */}
                <div className="col-span-5 overflow-hidden pr-4">
                  <p className="font-semibold text-[#111111] truncate">{job.subject}</p>
                  <p className="text-[11px] text-[#5F5A54] truncate mt-0.5">{job.body}</p>
                </div>

                {/* Column 3: Scheduled Time */}
                <div className="col-span-2 text-[11px] font-mono text-[#5F5A54]">
                  {formatScheduledDate(job.scheduledAt)}
                </div>

                {/* Column 4: Status Badge & Star */}
                <div className="col-span-2 flex items-center justify-end gap-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                      job.status === 'RATE_LIMITED'
                        ? 'bg-[#FAF2E6] text-[#8A601E] border-[#ECD8B5]'
                        : 'bg-[#EBE7E0] text-[#2D2926] border-[#D8D2C9]'
                    }`}
                  >
                    {job.status === 'RATE_LIMITED' ? 'Rate Limited' : 'Scheduled'}
                  </span>

                  <button
                    onClick={(e) => toggleStar(job.id, e)}
                    className="p-1 text-[#D8D2C9] hover:text-[#111111] transition-colors cursor-pointer shrink-0"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isStarred ? 'fill-[#111111] text-[#111111]' : 'text-[#D8D2C9]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="p-4 px-8 border-t border-[#D8D2C9] flex items-center justify-between text-xs text-[#5F5A54] bg-[#FAF8F5]">
          <span className="font-mono text-[11px]">
            Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} jobs
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1 rounded-lg border border-[#D8D2C9] bg-[#FFFFFF] hover:bg-[#EBE7E0] disabled:opacity-40 text-xs font-medium cursor-pointer transition-colors"
            >
              Previous
            </button>
            <span className="font-mono text-xs px-2 text-[#111111]">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1 rounded-lg border border-[#D8D2C9] bg-[#FFFFFF] hover:bg-[#EBE7E0] disabled:opacity-40 text-xs font-medium cursor-pointer transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
