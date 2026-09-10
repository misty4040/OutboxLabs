import { leadParserService } from './leadParser.service';

describe('Phase 4: Lead Parser Service', () => {
  it('should parse, trim, and lowercase valid emails from array', () => {
    const input = [' Alice@example.com ', 'BOB@COMPANY.ORG', 'carol.smith+tag@domain.co.uk'];
    const result = leadParserService.parseLeads(input, 'array');

    expect(result.totalParsed).toBe(3);
    expect(result.validCount).toBe(3);
    expect(result.invalidCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
    expect(result.validRecipients).toEqual([
      'alice@example.com',
      'bob@company.org',
      'carol.smith+tag@domain.co.uk',
    ]);
  });

  it('should detect and separate duplicates', () => {
    const input = ['user@domain.com', 'OTHER@domain.com', 'USER@domain.com', 'other@domain.com'];
    const result = leadParserService.parseLeads(input, 'array');

    expect(result.validCount).toBe(2);
    expect(result.duplicateCount).toBe(2);
    expect(result.validRecipients).toEqual(['user@domain.com', 'other@domain.com']);
    expect(result.duplicates).toEqual(['user@domain.com', 'other@domain.com']);
  });

  it('should capture invalid emails with row number and reason', () => {
    const input = ['valid@domain.com', 'not-an-email', 'missing-at.com', 'trailing@dot.', '   '];
    const result = leadParserService.parseLeads(input, 'array');

    expect(result.validCount).toBe(1);
    expect(result.validRecipients).toEqual(['valid@domain.com']);
    expect(result.invalidCount).toBe(3); // '   ' was blank and skipped
    expect(result.invalidBreakdown).toEqual([
      { row: 2, value: 'not-an-email', reason: 'Invalid email syntax' },
      { row: 3, value: 'missing-at.com', reason: 'Invalid email syntax' },
      { row: 4, value: 'trailing@dot.', reason: 'Invalid email syntax' },
    ]);
  });

  it('should parse CSV content with header row', () => {
    const csvContent = `First Name,Email,Company
Alice,alice@example.com,Acme
Bob,bob@corp.io,Initech
Carol,carol@test.org,Global`;

    const result = leadParserService.parseLeads(csvContent, 'csv');
    expect(result.validCount).toBe(3);
    expect(result.validRecipients).toEqual([
      'alice@example.com',
      'bob@corp.io',
      'carol@test.org',
    ]);
  });

  it('should parse newline-separated TXT content', () => {
    const txtContent = `lead1@startup.io\r\nlead2@enterprise.com\n\nlead3@agency.co`;
    const result = leadParserService.parseLeads(txtContent, 'txt');

    expect(result.validCount).toBe(3);
    expect(result.validRecipients).toEqual([
      'lead1@startup.io',
      'lead2@enterprise.com',
      'lead3@agency.co',
    ]);
  });
});
