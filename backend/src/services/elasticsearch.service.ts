import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';
import { EmailJob } from '@prisma/client';

export const EMAILS_INDEX_NAME = 'reachinbox_emails';

export interface SearchEmailsQueryOptions {
  userId: string;
  query?: string;
  status?: string;
  page?: number;
  limit?: number;
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

export interface SearchResult {
  hits: SearchResultHit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ElasticsearchService {
  private client: Client | null = null;
  private isIndexInitialized = false;

  getClient(): Client {
    if (!this.client) {
      this.client = new Client({
        node: env.ELASTICSEARCH_URL,
        requestTimeout: 10000,
      });
    }
    return this.client;
  }

  /**
   * Initializes the emails search index with explicit full-text mappings
   */
  async initIndex(): Promise<void> {
    if (this.isIndexInitialized) return;

    const client = this.getClient();

    try {
      const exists = await client.indices.exists({ index: EMAILS_INDEX_NAME });

      if (!exists) {
        await client.indices.create({
          index: EMAILS_INDEX_NAME,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                userId: { type: 'keyword' },
                campaignId: { type: 'keyword' },
                recipient: {
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        console.log(`🔍 [Elasticsearch] Created index: ${EMAILS_INDEX_NAME}`);
      }

      this.isIndexInitialized = true;
    } catch (error: any) {
      // In development/test environments where ES container might not be running yet, log warning without crashing
      console.warn(`⚠️ [Elasticsearch] Index initialization skipped or failed: ${error.message}`);
    }
  }

  /**
   * Indexes or updates an EmailJob document
   */
  async indexEmailJob(job: EmailJob): Promise<void> {
    const client = this.getClient();

    try {
      await client.index({
        index: EMAILS_INDEX_NAME,
        id: job.id,
        document: {
          id: job.id,
          userId: job.userId,
          campaignId: job.campaignId,
          recipient: job.recipient,
          subject: job.subject,
          body: job.body,
          status: job.status,
          scheduledAt: job.scheduledAt.toISOString(),
          sentAt: job.sentAt ? job.sentAt.toISOString() : null,
          createdAt: job.createdAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.warn(`⚠️ [Elasticsearch] Failed to index job ${job.id}: ${error.message}`);
    }
  }

  /**
   * Full-text search strictly scoped to the authenticated user
   */
  async searchEmails(options: SearchEmailsQueryOptions): Promise<SearchResult> {
    const client = this.getClient();
    const { userId, query, status, page = 1, limit = 20 } = options;
    const from = (page - 1) * limit;

    const mustClauses: any[] = [
      // Strict multi-tenant security: user can ONLY see their own emails
      { term: { userId } },
    ];

    if (status) {
      mustClauses.push({ term: { status } });
    }

    if (query && query.trim() !== '') {
      mustClauses.push({
        multi_match: {
          query: query.trim(),
          fields: ['recipient^3', 'subject^2', 'body'],
          fuzziness: 'AUTO',
        },
      });
    }

    try {
      const response = await client.search({
        index: EMAILS_INDEX_NAME,
        from,
        size: limit,
        body: {
          query: {
            bool: {
              must: mustClauses,
            },
          },
          sort: [{ scheduledAt: { order: 'desc' } }],
          highlight: {
            fields: {
              subject: {},
              body: {},
              recipient: {},
            },
          },
        },
      });

      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      const hits: SearchResultHit[] = response.hits.hits.map((hit: any) => ({
        ...hit._source,
        highlight: hit.highlight,
      }));

      return {
        hits,
        total: totalHits,
        page,
        limit,
        totalPages: Math.ceil(totalHits / limit),
      };
    } catch (error: any) {
      console.warn(`⚠️ [Elasticsearch] Search query failed: ${error.message}`);
      // Return empty result gracefully if index is empty or ES is unreachable
      return {
        hits: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }
}

export const elasticsearchService = new ElasticsearchService();
