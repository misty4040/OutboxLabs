import React from 'react';
import { DashboardStats } from '../types';

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  const items = [
    {
      label: 'SCHEDULED',
      value: stats?.scheduledCount ?? 0,
      description: 'Pending in BullMQ queue',
    },
    {
      label: 'DELIVERED',
      value: stats?.sentCount ?? 0,
      description: 'Dispatched via Ethereal SMTP',
    },
    {
      label: 'RATE LIMITED',
      value: stats?.rateLimitedCount ?? 0,
      description: 'Queued for subsequent window',
    },
    {
      label: 'FAILED',
      value: stats?.failedCount ?? 0,
      description: 'Exhausted retry threshold',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#D8D2C9] bg-[#FAF8F5]">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`p-6 ${
            idx < items.length - 1 ? 'border-r border-[#D8D2C9]' : ''
          } flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#8C867E] font-mono">
              {item.label}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#111111] tracking-tight font-sans">
            {loading ? (
              <div className="h-9 w-16 bg-[#EBE7E0] animate-pulse rounded"></div>
            ) : (
              item.value.toLocaleString()
            )}
          </div>
          <p className="text-[11px] text-[#5F5A54] mt-2 font-normal leading-tight">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
};
