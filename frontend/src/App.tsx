import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { UserProfile, DashboardStats, EmailJob } from './types';
import { authApi, emailApi } from './api/client';
import { Sidebar } from './components/Sidebar';
import { StatsCards } from './components/StatsCards';
import { ScheduledView } from './components/ScheduledView';
import { SentView } from './components/SentView';
import { EmailDetailView } from './components/EmailDetailView';
import { ComposeModal } from './components/ComposeModal';
import { LoginView } from './components/LoginView';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // Scheduled table state
  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledTotalPages, setScheduledTotalPages] = useState(1);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [scheduledError, setScheduledError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check initial authentication and OAuth redirect token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlError = params.get('error');

    if (urlError) {
      setAuthError(decodeURIComponent(urlError));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (urlToken) {
      localStorage.setItem('reachinbox_token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      const currentUser = await authApi.getMe();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Load stats and tables once authenticated
  // Load stats and tables once authenticated, with 3s background polling
  useEffect(() => {
    if (!user) return;

    loadStats();
    loadScheduledJobs(scheduledPage, true);

    const interval = setInterval(() => {
      loadStats();
      if (activeTab === 'scheduled') {
        loadScheduledJobs(scheduledPage, false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, activeTab, scheduledPage]);

  const loadStats = async () => {
    try {
      const data = await emailApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadScheduledJobs = async (page = 1, showLoading = true) => {
    try {
      if (showLoading) setScheduledLoading(true);
      setScheduledError(null);
      const result = await emailApi.getScheduled(page, 10);
      setScheduledJobs(result.jobs);
      setScheduledTotal(result.total);
      setScheduledPage(result.page);
      setScheduledTotalPages(result.totalPages);
    } catch (err: any) {
      if (showLoading) {
        setScheduledError(err.response?.data?.message || 'Failed to load scheduled emails');
      }
    } finally {
      if (showLoading) setScheduledLoading(false);
    }
  };

  const handleCampaignCreated = () => {
    loadStats();
    loadScheduledJobs(1);
    setSelectedEmail(null);
    setActiveTab('scheduled');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F1EC] flex items-center justify-center text-[#5F5A54] font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#111111] animate-spin" />
          <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#8C867E]">
            Initializing ReachInbox Console...
          </p>
        </div>
      </div>
    );
  }

  // 1️⃣ Login Screen (Editorial Minimal)
  if (!user) {
    return <LoginView onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} initialError={authError} />;
  }

  // 2️⃣ Main Dashboard Layout (Editorial Sidebar + Content Area)
  return (
    <div className="min-h-screen bg-[#F4F1EC] flex font-sans selection:bg-[#111111] selection:text-[#F4F1EC]">
      {/* Editorial Sidebar */}
      <Sidebar
        user={user}
        stats={stats}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSelectedEmail(null);
        }}
        onOpenCompose={() => setComposeOpen(true)}
        onLogout={() => setUser(null)}
        onUserUpdate={checkAuth}
      />

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FFFFFF]">
        {/* Minimal Editorial Stats Grid (When on main list) */}
        {!selectedEmail && (
          <StatsCards stats={stats} loading={scheduledLoading} />
        )}

        {selectedEmail ? (
          // Full Email Details Screen
          <EmailDetailView
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
          />
        ) : activeTab === 'scheduled' ? (
          // Scheduled Emails List
          <ScheduledView
            jobs={scheduledJobs}
            total={scheduledTotal}
            page={scheduledPage}
            totalPages={scheduledTotalPages}
            loading={scheduledLoading}
            error={scheduledError}
            onPageChange={(p) => loadScheduledJobs(p)}
            onRefresh={() => {
              loadStats();
              loadScheduledJobs(scheduledPage);
            }}
            onComposeClick={() => setComposeOpen(true)}
          />
        ) : (
          // Sent Emails List
          <SentView
            onSelectEmail={(email) => setSelectedEmail(email)}
            onRefreshStats={loadStats}
          />
        )}
      </main>

      {/* Compose New Email Modal */}
      <ComposeModal
        isOpen={composeOpen}
        userEmail={user.email}
        onClose={() => setComposeOpen(false)}
        onCampaignCreated={handleCampaignCreated}
      />
    </div>
  );
}
