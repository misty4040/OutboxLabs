import React, { useState } from 'react';
import { Search, SlidersHorizontal, RotateCw, Clock, Star, AlertCircle } from 'lucide-react';
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
    <div className="flex-1 flex flex-col bg-white min-h-full">
      {/* Top Action Bar (Figma Search Pill + Filter + Refresh) */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2 rounded-full bg-[#F3F4F6] text-gray-800 placeholder-gray-400 text-xs border border-transparent focus:bg-white focus:border-gray-300 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            title="Filter"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {loading && jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
            <RotateCw className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Loading scheduled queue...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs space-y-3">
            <p className="font-medium text-gray-700 text-sm">No scheduled emails</p>
            <p className="text-gray-400 text-xs max-w-sm mx-auto">
              Your outbound queue is clear. Click Compose to schedule a new campaign with staggered delays.
            </p>
            <button
              onClick={onComposeClick}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00A859] hover:bg-[#00924d] text-white font-semibold text-xs shadow-sm transition cursor-pointer"
            >
              Compose Email
            </button>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isStarred = starredMap[job.id] || false;
            return (
              <div
                key={job.id}
                className="px-6 py-3.5 hover:bg-gray-50/80 flex items-center justify-between gap-4 transition text-xs select-none"
              >
                {/* Left: Recipient */}
                <div className="w-40 shrink-0">
                  <span className="font-semibold text-gray-900 truncate block">
                    To: {job.recipient.split('@')[0]}
                  </span>
                  <span className="text-[11px] text-gray-400 truncate block">{job.recipient}</span>
                </div>

                {/* Middle: Orange Scheduled Time Badge + Subject & Snippet */}
                <div className="flex-1 flex items-center gap-3 overflow-hidden">
                  {/* Figma Orange Pill Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-[11px] font-medium shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatScheduledDate(job.scheduledAt)}
                  </span>

                  {job.status === 'RATE_LIMITED' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold shrink-0">
                      Rate Limited (Next Window)
                    </span>
                  )}

                  {/* Subject & Body Preview */}
                  <div className="truncate text-gray-600">
                    <span className="font-semibold text-gray-900">{job.subject}</span>
                    <span className="text-gray-400 ml-1.5">- {job.body.slice(0, 75)}...</span>
                  </div>
                </div>

                {/* Right: Star Icon */}
                <button
                  onClick={(e) => toggleStar(job.id, e)}
                  className="p-1 text-gray-300 hover:text-amber-400 transition cursor-pointer shrink-0"
                >
                  <Star
                    className={`w-4 h-4 ${
                      isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="p-3 px-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
          <span>
            Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, total)} of {total} scheduled
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-xs font-medium cursor-pointer"
            >
              Previous
            </button>
            <span className="font-semibold text-gray-700">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-xs font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
