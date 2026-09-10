import React from 'react';
import { Clock, Send, LogOut, ExternalLink, ChevronDown, CheckCircle2 } from 'lucide-react';
import { UserProfile, DashboardStats } from '../types';
import { authApi, slackApi } from '../api/client';

interface SidebarProps {
  user: UserProfile;
  stats: DashboardStats | null;
  activeTab: 'scheduled' | 'sent';
  onSelectTab: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onLogout: () => void;
  onUserUpdate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  stats,
  activeTab,
  onSelectTab,
  onOpenCompose,
  onLogout,
  onUserUpdate,
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    onLogout();
  };

  const handleSlackConnect = async () => {
    try {
      const url = await slackApi.getConnectUrl();
      window.location.href = url;
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to connect Slack');
    }
  };

  const handleSlackDisconnect = async () => {
    if (!confirm('Disconnect Slack notifications?')) return;
    try {
      await slackApi.disconnect();
      onUserUpdate();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to disconnect Slack');
    }
  };

  return (
    <aside className="w-64 bg-[#FAF8F5] border-r border-[#D8D2C9] min-h-screen flex flex-col p-5 select-none shrink-0 font-sans">
      {/* Editorial Brand Header */}
      <div className="px-1 pt-1 pb-6">
        <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#8C867E] block mb-1 font-mono">
          OUTBOUND CONSOLE
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold tracking-tight text-[#111111]">ReachInbox</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-[#D8D2C9] text-[#5F5A54]">
            ONE
          </span>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="relative mb-6">
        <div
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFFFF] border border-[#D8D2C9] hover:border-[#111111]/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-[#D8D2C9] shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#111111] text-[#F4F1EC] font-bold text-xs flex items-center justify-center shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left overflow-hidden">
              <p className="text-xs font-semibold text-[#111111] truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-[#5F5A54] truncate leading-tight font-mono">{user.email}</p>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C867E] shrink-0 ml-1" />
        </div>

        {/* Profile Dropdown */}
        {profileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#FFFFFF] border border-[#D8D2C9] rounded-xl shadow-md p-2 z-40 text-xs space-y-1">
            <div className="px-2.5 py-2 border-b border-[#EBE7E0]">
              <p className="font-semibold text-[#111111]">{user.name}</p>
              <p className="text-[11px] text-[#5F5A54] font-mono">{user.email}</p>
            </div>

            {user.slackConnected ? (
              <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] text-[#2D2926] bg-[#EBE7E0] rounded-lg">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#111111]" /> Slack Connected
                </span>
                <button
                  onClick={handleSlackDisconnect}
                  className="text-[#9E3618] hover:underline cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleSlackConnect}
                className="w-full text-left px-2.5 py-1.5 hover:bg-[#FAF8F5] rounded-lg text-[11px] text-[#5F5A54] flex items-center justify-between cursor-pointer"
              >
                <span>Connect Slack</span>
                <span className="text-[10px] text-[#111111] font-mono uppercase">Alerts</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full text-left px-2.5 py-1.5 hover:bg-[#FBF2EE] text-[#9E3618] rounded-lg text-xs flex items-center gap-2 cursor-pointer font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Primary Action Button: Compose (Near-black with warm-white text) */}
      <button
        onClick={onOpenCompose}
        className="w-full py-2.5 px-4 rounded-xl bg-[#141414] hover:bg-[#262626] active:bg-[#000000] text-[#F4F1EC] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs mb-6 border border-[#141414]"
      >
        <span className="text-sm font-normal leading-none">+</span>
        <span>Compose Campaign</span>
      </button>

      {/* Section Header: WORKSPACE */}
      <div className="px-1 mb-2">
        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#8C867E] font-mono">
          WORKSPACE
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1 text-xs">
        {/* Scheduled Item */}
        <button
          onClick={() => onSelectTab('scheduled')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'scheduled'
              ? 'bg-[#EBE7E0] text-[#111111] font-semibold border border-[#D8D2C9]'
              : 'text-[#5F5A54] hover:bg-[#EBE7E0]/60 hover:text-[#111111] font-medium border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#5F5A54]" />
            <span>Scheduled</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'scheduled'
                ? 'bg-[#141414] text-[#F4F1EC] font-bold'
                : 'bg-[#EBE7E0] text-[#5F5A54] font-medium'
            }`}
          >
            {stats?.scheduledCount ?? 0}
          </span>
        </button>

        {/* Sent Item */}
        <button
          onClick={() => onSelectTab('sent')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'sent'
              ? 'bg-[#EBE7E0] text-[#111111] font-semibold border border-[#D8D2C9]'
              : 'text-[#5F5A54] hover:bg-[#EBE7E0]/60 hover:text-[#111111] font-medium border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Send className="w-4 h-4 text-[#5F5A54]" />
            <span>Delivered</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'sent'
                ? 'bg-[#141414] text-[#F4F1EC] font-bold'
                : 'bg-[#EBE7E0] text-[#5F5A54] font-medium'
            }`}
          >
            {stats?.sentCount ?? 0}
          </span>
        </button>
      </nav>

      {/* Bull Board Admin Queue Monitor */}
      <div className="mt-auto pt-4 border-t border-[#D8D2C9]">
        <a
          href="/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-[#5F5A54] hover:text-[#111111] hover:bg-[#EBE7E0] text-xs transition-colors font-medium border border-transparent hover:border-[#D8D2C9]"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#111111]" />
            <span>BullMQ Engine</span>
          </span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </aside>
  );
};
