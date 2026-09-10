export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  slackConnected: boolean;
  slackTeam?: string | null;
  createdAt: string;
}

export type EmailJobStatus =
  | 'PENDING'
  | 'DELAYED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED'
  | 'RATE_LIMITED';

export interface EmailJob {
  id: string;
  campaignId: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: EmailJobStatus;
  attempts: number;
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  bullJobId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmailsMs: number;
  hourlyLimit: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    emailJobs: number;
  };
}

export interface DashboardStats {
  scheduledCount: number;
  sentCount: number;
  failedCount: number;
  rateLimitedCount: number;
  totalCount: number;
}

export interface LeadParseResult {
  totalParsed: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  validRecipients: string[];
  duplicates: string[];
  invalidBreakdown: Array<{
    row: number;
    value: string;
    reason: string;
  }>;
}

export interface SearchResultHit {
  id: string;
  userId: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  createdAt: string;
  highlight?: Record<string, string[]>;
}
