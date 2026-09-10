import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, SearchX } from 'lucide-react';
import { EmailJob, SearchResultHit } from '../types';
import { emailApi } from '../api/client';

interface SentTableProps {
  onRefreshStats: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({ onRefreshStats }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [searchHits, setSearchHits] = useState<SearchResultHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1); // reset to first page on new query
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Load emails (standard or Elasticsearch search)
  useEffect(() => {
    loadData();
  }, [debouncedQuery, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (debouncedQuery.trim()) {
        setIsSearching(true);
        const result = await emailApi.search(debouncedQuery, page, 10);
        setSearchHits(result.hits);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } else {
        setIsSearching(false);
        const result = await emailApi.getSent(page, 10);
        setJobs(result.jobs);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch sent emails');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
    onRefreshStats();
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">Delivered Emails</h3>
          <p className="text-xs text-slate-400">
            {total} email{total !== 1 ? 's' : ''} confirmed via Ethereal SMTP
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Elasticsearch Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search via Elasticsearch..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs shadow-inner"
            />
          </div>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 m-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="underline font-semibold text-rose-200 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-800/50 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : isSearching ? (
        // Render Elasticsearch Hits
        searchHits.length === 0 ? (
          <div className="py-16 text-center">
            <SearchX className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-semibold text-white">No search matches found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              No emails in Elasticsearch match "{debouncedQuery}".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Recipient</th>
                  <th className="px-6 py-3.5 font-semibold">Subject</th>
                  <th className="px-6 py-3.5 font-semibold">Sent At</th>
                  <th className="px-6 py-3.5 font-semibold">Match Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {searchHits.map((hit) => (
                  <tr key={hit.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-3.5 font-medium text-white max-w-[200px] truncate">
                      {hit.recipient}
                    </td>
                    <td className="px-6 py-3.5 text-slate-300 max-w-[260px] truncate">
                      {hit.subject}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 whitespace-nowrap">
                      {hit.sentAt ? new Date(hit.sentAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-indigo-400 font-mono text-[11px]">
                      ES Hit
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center">
          <h4 className="text-sm font-semibold text-white">No sent emails recorded</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            As your scheduled emails are claimed and dispatched, delivered messages will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Recipient</th>
                  <th className="px-6 py-3.5 font-semibold">Subject</th>
                  <th className="px-6 py-3.5 font-semibold">Sent At</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Ethereal Inbox</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-3.5 font-medium text-white max-w-[200px] truncate">
                      {job.recipient}
                    </td>
                    <td className="px-6 py-3.5 text-slate-300 max-w-[260px] truncate">
                      {job.subject}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 whitespace-nowrap">
                      {job.sentAt ? new Date(job.sentAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                        <CheckCircle2 className="w-3 h-3" /> Delivered
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <a
                        href="https://ethereal.email/messages"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition underline"
                      >
                        Open Inbox <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
