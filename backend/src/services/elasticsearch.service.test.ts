import { elasticsearchService, EMAILS_INDEX_NAME } from './elasticsearch.service';
import { EmailJobStatus } from '@prisma/client';

// Mock @elastic/elasticsearch
const mockSearch = jest.fn();
const mockIndex = jest.fn();
const mockExists = jest.fn();
const mockCreate = jest.fn();

jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({
    search: mockSearch,
    index: mockIndex,
    indices: {
      exists: mockExists,
      create: mockCreate,
    },
  })),
}));

describe('Phase 9: Elasticsearch Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initIndex', () => {
    it('should create index with proper mapping if not exists', async () => {
      mockExists.mockResolvedValue(false);
      mockCreate.mockResolvedValue({});

      await elasticsearchService.initIndex();

      expect(mockExists).toHaveBeenCalledWith({ index: EMAILS_INDEX_NAME });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          index: EMAILS_INDEX_NAME,
          body: expect.objectContaining({
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                userId: { type: 'keyword' },
                recipient: expect.any(Object),
                subject: { type: 'text' },
                body: { type: 'text' },
              }),
            }),
          }),
        })
      );
    });
  });

  describe('indexEmailJob', () => {
    it('should index an email job document', async () => {
      const mockJob = {
        id: 'job_es_1',
        userId: 'user_es_1',
        campaignId: 'camp_es_1',
        recipient: 'lead@target.com',
        subject: 'Q3 Product Demo',
        body: 'Excited to show you our new product.',
        scheduledAt: new Date('2026-09-10T12:00:00Z'),
        status: EmailJobStatus.SENT,
        attempts: 1,
        sentAt: new Date('2026-09-10T12:00:05Z'),
        failedAt: null,
        errorMessage: null,
        bullJobId: 'bull_1',
        createdAt: new Date('2026-09-10T11:00:00Z'),
        updatedAt: new Date('2026-09-10T12:00:05Z'),
      };

      mockIndex.mockResolvedValue({ result: 'created' });

      await elasticsearchService.indexEmailJob(mockJob);

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          index: EMAILS_INDEX_NAME,
          id: 'job_es_1',
          document: expect.objectContaining({
            id: 'job_es_1',
            userId: 'user_es_1',
            recipient: 'lead@target.com',
            subject: 'Q3 Product Demo',
          }),
        })
      );
    });
  });

  describe('searchEmails', () => {
    it('should construct bool query with strict userId term and multi_match query', async () => {
      mockSearch.mockResolvedValue({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [
            {
              _source: {
                id: 'job_es_1',
                userId: 'user_es_1',
                recipient: 'lead@target.com',
                subject: 'Q3 Product Demo',
                body: 'Excited to show you our new product.',
                status: 'SENT',
                scheduledAt: '2026-09-10T12:00:00Z',
                sentAt: '2026-09-10T12:00:05Z',
                createdAt: '2026-09-10T11:00:00Z',
              },
            },
          ],
        },
      });

      const result = await elasticsearchService.searchEmails({
        userId: 'user_es_1',
        query: 'Demo',
        page: 1,
        limit: 10,
      });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          index: EMAILS_INDEX_NAME,
          from: 0,
          size: 10,
          body: expect.objectContaining({
            query: {
              bool: {
                must: [
                  { term: { userId: 'user_es_1' } },
                  {
                    multi_match: {
                      query: 'Demo',
                      fields: ['recipient^3', 'subject^2', 'body'],
                      fuzziness: 'AUTO',
                    },
                  },
                ],
              },
            },
          }),
        })
      );

      expect(result.hits).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hits[0].subject).toBe('Q3 Product Demo');
    });
  });
});
