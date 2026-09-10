import React from 'react';
import { Clock, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { EmailJob, EmailJobStatus } from '../types';

interface ScheduledTableProps {
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

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
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
  const getStatusBadge = (status: EmailJobStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Pending
          </span>
        );
      case 'DELAYED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/50">
            <Clock className="w-3 h-3" /> Delayed
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 animate-pulse">
            Processing
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
            <AlertTriangle className="w-3 h-3" /> Capped (Rescheduled)
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Scheduled & Queued Emails</h3>
          <p className="text-xs text-slate-400">
            {total} email{total !== 1 ? 's' : ''} queued in BullMQ delayed schedule
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 m-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={onRefresh}
            className="underline font-semibold text-rose-200 cursor-pointer"
          >
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
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500 mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-white">No scheduled emails in queue</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Upload your lead list to schedule outreach with custom inter-email delay and hourly rate limits.
          </p>
          <button
            onClick={onComposeClick}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            Compose New Campaign
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Recipient</th>
                  <th className="px-6 py-3.5 font-semibold">Subject</th>
                  <th className="px-6 py-3.5 font-semibold">Target Time</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
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
                      {new Date(job.scheduledAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {getStatusBadge(job.status)}
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
                  onClick={() => onPageChange(page - 1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
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
