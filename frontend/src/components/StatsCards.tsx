import React from 'react';
import { Clock, Send, AlertTriangle, XCircle } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  const cards = [
    {
      title: 'Scheduled Emails',
      value: stats?.scheduledCount ?? 0,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      description: 'Pending or delayed in queue',
    },
    {
      title: 'Sent Successfully',
      value: stats?.sentCount ?? 0,
      icon: Send,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      description: 'Delivered via Ethereal SMTP',
    },
    {
      title: 'Rate Limited',
      value: stats?.rateLimitedCount ?? 0,
      icon: AlertTriangle,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      description: 'Rescheduled for next window',
    },
    {
      title: 'Failed Sends',
      value: stats?.failedCount ?? 0,
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      description: 'Exhausted retry attempts',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">{card.title}</span>
              <div className={`p-2 rounded-xl border ${card.bg}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? (
                <div className="h-8 w-16 bg-slate-800 animate-pulse rounded"></div>
              ) : (
                card.value.toLocaleString()
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
};
