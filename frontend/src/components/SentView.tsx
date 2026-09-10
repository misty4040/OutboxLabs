import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, RotateCw, Star, AlertCircle } from 'lucide-react';
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
      loadSentEmails(page);
    }
  }, [searchQuery, page]);

  const loadSentEmails = async (p = 1) => {
    try {
      setLoading(true);
      setError(null);
      setIsSearching(false);
      const res = await emailApi.getSent(p, 10);
      setJobs(res.jobs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load delivered emails');
    } finally {
      setLoading(false);
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
    <div className="flex-1 flex flex-col bg-white min-h-full">
      {/* Top Action Bar */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search sent emails (Elasticsearch)"
            className="w-full pl-10 pr-4 py-2 rounded-full bg-[#F3F4F6] text-gray-800 placeholder-gray-400 text-xs border border-transparent focus:bg-white focus:border-gray-300 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {isSearching && (
            <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
              Elasticsearch
            </span>
          )}
          <button
            title="Filter"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              loadSentEmails(page);
              onRefreshStats();
            }}
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

      {/* Sent Emails List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {loading && jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
            <RotateCw className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Loading delivered emails...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs space-y-2">
            <p className="font-medium text-gray-700 text-sm">No delivered emails yet</p>
            <p className="text-gray-400 text-xs max-w-sm mx-auto">
              {searchQuery
                ? `No results matched "${searchQuery}". Try another keyword.`
                : 'Emails will appear here once dispatched via SMTP.'}
            </p>
          </div>
        ) : (
          jobs.map((job: EmailJob) => {
            const isStarred = starredMap[job.id] || false;
            return (
              <div
                key={job.id}
                onClick={() => onSelectEmail(job)}
                className="px-6 py-3.5 hover:bg-gray-50/80 flex items-center justify-between gap-4 transition text-xs select-none cursor-pointer group"
              >
                {/* Left: Recipient */}
                <div className="w-40 shrink-0">
                  <span className="font-semibold text-gray-900 truncate block">
                    To: {job.recipient.split('@')[0]}
                  </span>
                  <span className="text-[11px] text-gray-400 truncate block">{job.recipient}</span>
                </div>

                {/* Middle: Grey Sent Status Badge + Subject & Snippet */}
                <div className="flex-1 flex items-center gap-3 overflow-hidden">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      job.status === 'SENT'
                        ? 'bg-gray-100 text-gray-700 border border-gray-200'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {job.status === 'SENT' ? 'Sent' : 'Failed'}
                  </span>

                  <div className="truncate text-gray-600">
                    <span className="font-semibold text-gray-900">{job.subject}</span>
                    <span className="text-gray-400 ml-1.5">- {job.body.slice(0, 75)}...</span>
                  </div>
                </div>

                {/* Right: Action & Star */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-400 group-hover:text-emerald-600 font-medium">
                    View &rarr;
                  </span>
                  <button
                    onClick={(e) => toggleStar(job.id, e)}
                    className="p-1 text-gray-300 hover:text-amber-400 transition cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
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
        <div className="p-3 px-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
          <span>
            Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, total)} of {total} emails
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p: number) => p - 1)}
              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-xs font-medium cursor-pointer"
            >
              Previous
            </button>
            <span className="font-semibold text-gray-700">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p: number) => p + 1)}
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
