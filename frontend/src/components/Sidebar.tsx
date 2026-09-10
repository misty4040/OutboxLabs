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
    <aside className="w-64 bg-white border-r border-gray-200/80 min-h-screen flex flex-col p-4 select-none shrink-0">
      {/* Figma ONE Brand Logo */}
      <div className="px-2 pt-1 pb-4">
        <span className="text-xl font-black tracking-widest text-gray-900">ONE</span>
      </div>

      {/* User Profile Card */}
      <div className="relative mb-5">
        <div
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="flex items-center justify-between p-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50/70 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#00A859] font-bold text-xs flex items-center justify-center shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left overflow-hidden">
              <p className="text-xs font-bold text-gray-900 truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-gray-500 truncate leading-tight">{user.email}</p>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
        </div>

        {/* Profile Dropdown */}
        {profileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-40 text-xs space-y-1">
            <div className="px-2 py-1.5 border-b border-gray-100">
              <p className="font-semibold text-gray-800">{user.name}</p>
              <p className="text-[11px] text-gray-400">{user.email}</p>
            </div>

            {user.slackConnected ? (
              <div className="px-2 py-1.5 flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 rounded-lg">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Slack Connected
                </span>
                <button
                  onClick={handleSlackDisconnect}
                  className="text-rose-600 hover:underline cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleSlackConnect}
                className="w-full text-left px-2 py-1.5 hover:bg-gray-50 rounded-lg text-[11px] text-gray-600 flex items-center justify-between cursor-pointer"
              >
                <span>Connect Slack</span>
                <span className="text-[10px] text-emerald-600 font-medium">Alerts</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full text-left px-2 py-1.5 hover:bg-rose-50 text-rose-600 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Figma Green Outlined Compose Button */}
      <button
        onClick={onOpenCompose}
        className="w-full py-2 px-4 rounded-xl border border-[#00A859] text-[#00A859] hover:bg-[#E6F4EA] font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mb-6"
      >
        Compose
      </button>

      {/* Section Header: CORE */}
      <div className="px-2 mb-2">
        <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Core</p>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1 text-xs">
        {/* Scheduled Item */}
        <button
          onClick={() => onSelectTab('scheduled')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer ${
            activeTab === 'scheduled'
              ? 'bg-[#E6F4EA] text-[#008744] font-semibold'
              : 'text-gray-600 hover:bg-gray-100/80 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4" />
            <span>Scheduled</span>
          </div>
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              activeTab === 'scheduled'
                ? 'bg-[#ceead6] text-[#0d652d] font-bold'
                : 'text-gray-400 font-medium'
            }`}
          >
            {stats?.scheduledCount ?? 0}
          </span>
        </button>

        {/* Sent Item */}
        <button
          onClick={() => onSelectTab('sent')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer ${
            activeTab === 'sent'
              ? 'bg-[#E6F4EA] text-[#008744] font-semibold'
              : 'text-gray-600 hover:bg-gray-100/80 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Send className="w-4 h-4" />
            <span>Sent</span>
          </div>
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              activeTab === 'sent'
                ? 'bg-[#ceead6] text-[#0d652d] font-bold'
                : 'text-gray-400 font-medium'
            }`}
          >
            {stats?.sentCount ?? 0}
          </span>
        </button>
      </nav>

      {/* Bull Board Admin Queue Monitor */}
      <div className="mt-auto pt-4 border-t border-gray-100">
        <a
          href="/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 text-xs transition font-medium"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Bull Board Queues
          </span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </aside>
  );
};
