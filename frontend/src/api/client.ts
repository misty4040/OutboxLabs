import axios from 'axios';
import {
  UserProfile,
  DashboardStats,
  EmailJob,
  Campaign,
  LeadParseResult,
  SearchResultHit,
} from '../types';

const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://outboxlabs-production.up.railway.app';
  }
  return '';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  getMe: async (): Promise<UserProfile> => {
    const res = await api.get('/auth/me');
    return res.data.data;
  },
  getGoogleAuthUrl: async (): Promise<string> => {
    const res = await api.get('/auth/google/url');
    return res.data.data.url;
  },
  devLogin: async (email: string, name: string): Promise<UserProfile> => {
    // Development quick-login helper using POST /auth/google
    const res = await api.post('/auth/google', {
      idToken: 'mock-dev-token',
      devOverride: { email, name },
    });
    return res.data.data.user;
  },
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};

export const emailApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get('/api/dashboard/stats');
    return res.data.data;
  },
  getScheduled: async (
    page = 1,
    limit = 10
  ): Promise<{ jobs: EmailJob[]; total: number; page: number; totalPages: number }> => {
    const res = await api.get(`/api/emails/scheduled?page=${page}&limit=${limit}`);
    return res.data.data;
  },
  getSent: async (page = 1, limit = 10): Promise<{ jobs: EmailJob[]; total: number; totalPages: number }> => {
    const res = await api.get(`/api/emails/sent?page=${page}&limit=${limit}`);
    return res.data.data;
  },
  search: async (
    query: string,
    page = 1,
    limit = 10
  ): Promise<{ hits: SearchResultHit[]; total: number; totalPages: number }> => {
    const res = await api.get(`/api/emails/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    return res.data.data;
  },
};

export const campaignApi = {
  parseLeads: async (formData: FormData): Promise<LeadParseResult> => {
    const res = await api.post('/api/campaigns/parse-leads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
  createCampaign: async (data: {
    subject: string;
    body: string;
    startTime?: string;
    delayBetweenEmailsMs?: number;
    hourlyLimit?: number;
    recipients: string[];
  }): Promise<{ campaign: Campaign; jobsCount: number }> => {
    const res = await api.post('/api/campaigns', data);
    return res.data.data;
  },
  listCampaigns: async (): Promise<Campaign[]> => {
    const res = await api.get('/api/campaigns');
    return res.data.data;
  },
};

export const slackApi = {
  getConnectUrl: async (): Promise<string> => {
    const res = await api.get('/api/slack/connect');
    return res.data.data.url;
  },
  disconnect: async (): Promise<void> => {
    await api.post('/api/slack/disconnect');
  },
};
