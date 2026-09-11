import React, { useState, useEffect } from 'react';
import { Search, RotateCw, Star, AlertCircle } from 'lucide-react';
import { EmailJob } from '../types';
import { emailApi } from '../api/client';

interface SentViewProps {
  onSelectEmail: (email: EmailJob) => void;
  onRefreshStats: () => void;
}

export const SentView: React.FC<SentViewProps> = ({ onSelectEmail, onRefreshStats }) => {
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        performSearch(searchQuery, 1);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      loadSentEmails(page, true);

      // Auto-poll sent emails every 3 seconds while on Delivered tab
      const interval = setInterval(() => {
        loadSentEmails(page, false);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [searchQuery, page]);

  const loadSentEmails = async (p = 1, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      setIsSearching(false);
      const res = await emailApi.getSent(p, 10);
      setJobs(res.jobs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      onRefreshStats();
    } catch (err: any) {
      if (showLoading) {
        setError(err.response?.data?.message || 'Failed to load delivered emails');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const performSearch = async (q: string, p = 1) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearching(true);
      const res = await emailApi.search(q, p, 10);
      const mapped: EmailJob[] = res.hits.map((h) => ({
        id: h.id,
        campaignId: h.campaignId,
        userId: h.userId,
        recipient: h.recipient,
        subject: h.subject,
        body: h.body,
        scheduledAt: h.scheduledAt,
        status: h.status as any,
        attempts: 1,
        sentAt: h.sentAt,
        createdAt: h.createdAt,
        updatedAt: h.createdAt,
      }));
      setJobs(mapped);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredMap((prev: Record<string, boolean>) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FFFFFF] min-h-full font-sans">
      {/* Editorial Section Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[#D8D2C9] bg-[#FAF8F5]">
        <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#8C867E] block mb-1 font-mono">
          DISPATCHED ARCHIVE
        </span>
        <div className="flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111111] leading-none">
              Delivered Emails
            </h1>
            <p className="text-xs text-[#5F5A54] mt-2 max-w-xl leading-relaxed">
              Full-text searchable archive indexed in real-time with Elasticsearch and delivered via SMTP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#8C867E]">
              {total} {total === 1 ? 'Message' : 'Messages'} archived
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar (Elasticsearch Query + Refresh) */}
      <div className="px-8 py-3.5 border-b border-[#D8D2C9] flex items-center justify-between gap-4 bg-[#FFFFFF]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#8C867E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search email body, subject, or recipient (Elasticsearch)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF8F5] text-[#111111] placeholder-[#8C867E] text-xs border border-[#D8D2C9] focus:bg-[#FFFFFF] focus:border-[#111111] focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {isSearching && (
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#111111] bg-[#EBE7E0] border border-[#D8D2C9] px-2.5 py-1 rounded">
              Elasticsearch Active
            </span>
          )}
          <button
            onClick={() => {
              loadSentEmails(page);
              onRefreshStats();
            }}
            disabled={loading}
            title="Refresh Delivered"
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
        <div className="col-span-2">Dispatched Time</div>
        <div className="col-span-2 text-right">Status</div>
      </div>

      {/* Sent Emails List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#EBE7E0]">
        {loading && jobs.length === 0 ? (
          <div className="p-16 text-center text-[#8C867E] text-xs flex flex-col items-center gap-3">
            <RotateCw className="w-5 h-5 animate-spin text-[#111111]" />
            <span className="font-mono uppercase tracking-wider text-[11px]">Querying Delivered Index...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center text-[#5F5A54] text-xs space-y-3">
            <p className="font-bold text-[#111111] text-base tracking-tight">NO DELIVERED EMAILS YET</p>
            <p className="text-[#8C867E] text-xs max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? `No indexed results matched "${searchQuery}". Try a different keyword.`
                : 'Emails will appear here automatically once processed by BullMQ and sent via SMTP.'}
            </p>
          </div>
        ) : (
          jobs.map((job: EmailJob) => {
            const isStarred = starredMap[job.id] || false;
            const formattedTime = job.sentAt
              ? new Date(job.sentAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : 'Delivered';

            return (
              <div
                key={job.id}
                onClick={() => onSelectEmail(job)}
                className="px-8 py-4 hover:bg-[#FAF8F5] transition-colors text-xs grid grid-cols-1 sm:grid-cols-12 items-center gap-3 cursor-pointer group"
              >
                {/* Column 1: Recipient */}
                <div className="col-span-3 overflow-hidden pr-2">
                  <span className="font-semibold text-[#111111] truncate block group-hover:text-[#000000]">
                    {job.recipient.split('@')[0]}
                  </span>
                  <span className="text-[11px] text-[#8C867E] truncate block font-mono">{job.recipient}</span>
                </div>

                {/* Column 2: Subject & Snippet */}
                <div className="col-span-5 overflow-hidden pr-4">
                  <p className="font-semibold text-[#111111] truncate">{job.subject}</p>
                  <p className="text-[11px] text-[#5F5A54] truncate mt-0.5">{job.body}</p>
                </div>

                {/* Column 3: Sent Timestamp */}
                <div className="col-span-2 text-[11px] font-mono text-[#5F5A54]">
                  {formattedTime}
                </div>

                {/* Column 4: Status Badge & Star */}
                <div className="col-span-2 flex items-center justify-end gap-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                      job.status === 'SENT'
                        ? 'bg-[#EBE7E0] text-[#2D2926] border-[#D8D2C9]'
                        : 'bg-[#FBF2EE] text-[#9E3618] border-[#ECD1C5]'
                    }`}
                  >
                    {job.status === 'SENT' ? 'Delivered' : 'Failed'}
                  </span>

                  <span className="text-[11px] text-[#8C867E] group-hover:text-[#111111] font-mono">
                    View &rarr;
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
            Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} emails
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p: number) => p - 1)}
              className="px-3 py-1 rounded-lg border border-[#D8D2C9] bg-[#FFFFFF] hover:bg-[#EBE7E0] disabled:opacity-40 text-xs font-medium cursor-pointer transition-colors"
            >
              Previous
            </button>
            <span className="font-mono text-xs px-2 text-[#111111]">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p: number) => p + 1)}
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
