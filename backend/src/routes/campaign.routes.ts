import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware';
import { leadParserService } from '../services/leadParser.service';
import { campaignService } from '../services/campaign.service';
import { campaignRepository } from '../repositories/campaign.repository';
import { scheduleCampaignJobs } from '../queue/emailQueue';
import { sendError, sendSuccess } from '../utils/response';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export const campaignRouter = Router();

// Apply requireAuth to all campaign routes
campaignRouter.use(requireAuth);

/**
 * POST /api/campaigns/parse-leads
 * Parse and validate uploaded CSV or TXT lead list before scheduling
 */
campaignRouter.post(
  '/parse-leads',
  upload.single('file'),
  (req: Request, res: Response): void => {
    try {
      if (req.file) {
        const ext = req.file.originalname.split('.').pop()?.toLowerCase();
        const fileType = ext === 'csv' ? 'csv' : 'txt';
        const parsed = leadParserService.parseLeads(req.file.buffer, fileType);
        sendSuccess(res, parsed);
        return;
      }

      const { emails, rawText } = req.body;

      if (emails && Array.isArray(emails)) {
        const parsed = leadParserService.parseLeads(emails, 'array');
        sendSuccess(res, parsed);
        return;
      }

      if (rawText && typeof rawText === 'string') {
        const parsed = leadParserService.parseLeads(rawText, 'txt');
        sendSuccess(res, parsed);
        return;
      }

      sendError(res, 'No file, email array, or raw text provided', 400);
    } catch (err: any) {
      sendError(res, err.message || 'Failed to parse leads', 400);
    }
  }
);

/**
 * POST /api/campaigns
 * Create a new campaign and persist staggered EmailJobs in the database
 */
campaignRouter.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      let recipients: string[] = [];

      // If file uploaded, parse it
      if (req.file) {
        const ext = req.file.originalname.split('.').pop()?.toLowerCase();
        const parseResult = leadParserService.parseLeads(
          req.file.buffer,
          ext === 'csv' ? 'csv' : 'txt'
        );
        recipients = parseResult.validRecipients;
      } else if (req.body.recipients) {
        // Recipients passed as JSON array or comma-separated string
        if (Array.isArray(req.body.recipients)) {
          recipients = req.body.recipients;
        } else if (typeof req.body.recipients === 'string') {
          try {
            recipients = JSON.parse(req.body.recipients);
          } catch {
            recipients = req.body.recipients.split(',').map((e: string) => e.trim());
          }
        }
      }

      // Filter and validate recipients list
      const validated = leadParserService.parseLeads(recipients, 'array');
      if (validated.validCount === 0) {
        sendError(res, 'No valid recipient email addresses provided', 400);
        return;
      }

      const { subject, body, startTime, delayBetweenEmailsMs, hourlyLimit } = req.body;

      const result = await campaignService.createCampaign({
        userId: user.id,
        subject,
        body,
        startTime,
        delayBetweenEmailsMs: delayBetweenEmailsMs ? Number(delayBetweenEmailsMs) : undefined,
        hourlyLimit: hourlyLimit ? Number(hourlyLimit) : undefined,
        recipients: validated.validRecipients,
      });

      // Enqueue jobs into BullMQ with staggered delays
      await scheduleCampaignJobs(result.campaign, result.jobs);

      sendSuccess(
        res,
        {
          campaign: result.campaign,
          jobsCount: result.jobsCount,
          firstScheduledAt: result.firstScheduledAt,
          lastScheduledAt: result.lastScheduledAt,
          invalidCount: validated.invalidCount,
          duplicateCount: validated.duplicateCount,
        },
        201
      );
    } catch (error: any) {
      console.error('Create campaign error:', error);
      sendError(res, error.message || 'Failed to create campaign', 400);
    }
  }
);

/**
 * GET /api/campaigns
 * Retrieve all campaigns for authenticated user
 */
campaignRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const campaigns = await campaignRepository.findManyByUserId(user.id);
    sendSuccess(res, campaigns);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve campaigns', 500);
  }
});

/**
 * GET /api/campaigns/:id
 * Retrieve specific campaign for authenticated user
 */
campaignRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const campaign = await campaignRepository.findById(req.params.id, user.id);

    if (!campaign) {
      sendError(res, 'Campaign not found', 404);
      return;
    }

    sendSuccess(res, campaign);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve campaign', 500);
  }
});
