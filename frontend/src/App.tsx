import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { UserProfile, DashboardStats, EmailJob } from './types';
import { authApi, emailApi } from './api/client';
import { Sidebar } from './components/Sidebar';
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

  // Check initial authentication
  useEffect(() => {
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
  useEffect(() => {
    if (user) {
      loadStats();
      loadScheduledJobs(scheduledPage);
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const data = await emailApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadScheduledJobs = async (page = 1) => {
    try {
      setScheduledLoading(true);
      setScheduledError(null);
      const result = await emailApi.getScheduled(page, 10);
      setScheduledJobs(result.jobs);
      setScheduledTotal(result.total);
      setScheduledPage(result.page);
      setScheduledTotalPages(result.totalPages);
    } catch (err: any) {
      setScheduledError(err.response?.data?.message || 'Failed to load scheduled emails');
    } finally {
      setScheduledLoading(false);
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-gray-500">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#00A859] animate-spin" />
          <p className="text-xs font-semibold tracking-wider text-gray-600">Loading ONE...</p>
        </div>
      </div>
    );
  }

  // 1️⃣ Login Screen (Figma Exact)
  if (!user) {
    return <LoginView onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  // 2️⃣ Main Dashboard Layout (Figma Sidebar + Content Area)
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Figma Sidebar */}
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {selectedEmail ? (
          // Full Email Details Screen (Figma email detail variant)
          <EmailDetailView
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
          />
        ) : activeTab === 'scheduled' ? (
          // 4️⃣ Scheduled Emails List (Figma scheduled table)
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
          // 5️⃣ Sent Emails List (Figma sent view with search)
          <SentView
            onSelectEmail={(email) => setSelectedEmail(email)}
            onRefreshStats={loadStats}
          />
        )}
      </main>

      {/* 3️⃣ Compose New Email Flow (Figma Compose modal & Send Later popover) */}
      <ComposeModal
        isOpen={composeOpen}
        userEmail={user.email}
        onClose={() => setComposeOpen(false)}
        onCampaignCreated={handleCampaignCreated}
      />
    </div>
  );
}
