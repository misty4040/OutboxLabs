import nodemailer from 'nodemailer';
import { emailSenderService } from './emailSender.service';

jest.mock('nodemailer');

describe('Phase 6: Email Sender Service (Nodemailer + Ethereal)', () => {
  const mockSendMail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });
    (nodemailer.createTestAccount as jest.Mock).mockResolvedValue({
      user: 'ethereal_user_test@ethereal.email',
      pass: 'ethereal_pass_123',
    });
    (nodemailer.getTestMessageUrl as jest.Mock).mockReturnValue('https://ethereal.email/message/test12345');
  });

  it('should send email and return messageId and preview URL', async () => {
    mockSendMail.mockResolvedValue({
      messageId: '<test-msg-123@ethereal.email>',
      accepted: ['recipient@domain.com'],
    });

    const result = await emailSenderService.sendEmail({
      to: 'recipient@domain.com',
      subject: 'Special Offer',
      body: 'Check out our new products!',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient@domain.com',
        subject: 'Special Offer',
        text: 'Check out our new products!',
      })
    );
    expect(result.messageId).toBe('<test-msg-123@ethereal.email>');
    expect(result.previewUrl).toBe('https://ethereal.email/message/test12345');
  });
});
