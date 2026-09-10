import React from 'react';
import { Mail, LogOut, LayoutDashboard, ExternalLink, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';
import { slackApi, authApi } from '../api/client';

interface HeaderProps {
  user: UserProfile;
  onUserUpdate: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onUserUpdate, onLogout }) => {
  const [connectingSlack, setConnectingSlack] = React.useState(false);

  const handleConnectSlack = async () => {
    try {
      setConnectingSlack(true);
      const url = await slackApi.getConnectUrl();
      window.location.href = url;
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to connect Slack');
      setConnectingSlack(false);
    }
  };

  const handleDisconnectSlack = async () => {
    if (!confirm('Are you sure you want to disconnect Slack notifications?')) return;
    try {
      await slackApi.disconnect();
      onUserUpdate();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to disconnect Slack');
    }
  };

  const handleLogoutClick = async () => {
    try {
      await authApi.logout();
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
      onLogout();
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">ReachInbox</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PROD
              </span>
            </div>
            <p className="text-xs text-slate-400">High-Concurrency Email Scheduler</p>
          </div>
        </div>

        <a
          href="/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60 shadow-sm"
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
          Bull Board Queues
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>

      <div className="flex items-center gap-3">
        {/* Slack Connection Status */}
        {user.slackConnected ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 font-medium">
              Slack: {user.slackTeam || 'Connected'}
            </span>
            <button
              onClick={handleDisconnectSlack}
              className="text-slate-400 hover:text-rose-400 text-[11px] underline ml-1 cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectSlack}
            disabled={connectingSlack}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#4A154B] hover:bg-[#5e1c5f] text-white transition shadow-sm border border-purple-800/40 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
            </svg>
            {connectingSlack ? 'Connecting...' : 'Connect Slack'}
          </button>
        )}

        {/* User Profile Badge */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-slate-700 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-700 flex items-center justify-center text-xs font-semibold text-indigo-200">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="hidden sm:block text-left text-xs">
            <p className="font-semibold text-slate-200 leading-tight">{user.name}</p>
            <p className="text-slate-400 text-[11px] truncate max-w-[140px]">{user.email}</p>
          </div>

          <button
            onClick={handleLogoutClick}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
