import { parse } from 'csv-parse/sync';

export interface ParseLeadsResult {
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

// RFC 5322 compliant regex for practical email validation
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export class LeadParserService {
  /**
   * Parses raw file buffer (CSV or TXT) or raw string array of emails
   */
  parseLeads(input: Buffer | string | string[], fileType: 'csv' | 'txt' | 'array'): ParseLeadsResult {
    let rawEntries: Array<{ row: number; raw: string }> = [];

    if (Array.isArray(input)) {
      rawEntries = input.map((val, idx) => ({ row: idx + 1, raw: String(val) }));
    } else {
      const content = Buffer.isBuffer(input) ? input.toString('utf-8') : input;

      if (fileType === 'csv') {
        rawEntries = this.extractFromCsv(content);
      } else {
        rawEntries = this.extractFromTxt(content);
      }
    }

    const seenEmails = new Set<string>();
    const validRecipients: string[] = [];
    const duplicates: string[] = [];
    const invalidBreakdown: Array<{ row: number; value: string; reason: string }> = [];

    for (const entry of rawEntries) {
      const trimmed = entry.raw.trim();

      if (!trimmed) {
        continue; // Skip blank lines
      }

      const normalized = trimmed.toLowerCase();

      if (!EMAIL_REGEX.test(normalized)) {
        invalidBreakdown.push({
          row: entry.row,
          value: entry.raw,
          reason: 'Invalid email syntax',
        });
        continue;
      }

      if (seenEmails.has(normalized)) {
        duplicates.push(normalized);
        continue;
      }

      seenEmails.add(normalized);
      validRecipients.push(normalized);
    }

    return {
      totalParsed: rawEntries.length,
      validCount: validRecipients.length,
      duplicateCount: duplicates.length,
      invalidCount: invalidBreakdown.length,
      validRecipients,
      duplicates,
      invalidBreakdown,
    };
  }

  private extractFromCsv(content: string): Array<{ row: number; raw: string }> {
    const rawEntries: Array<{ row: number; raw: string }> = [];

    try {
      const records: string[][] = parse(content, {
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      if (records.length === 0) return [];

      // Detect if row 0 is header
      let emailColIdx = -1;
      const firstRow = records[0];

      for (let i = 0; i < firstRow.length; i++) {
        const colHeader = firstRow[i].toLowerCase();
        if (colHeader === 'email' || colHeader === 'e-mail' || colHeader === 'recipient') {
          emailColIdx = i;
          break;
        }
      }

      let startRow = 0;
      if (emailColIdx !== -1) {
        startRow = 1; // skip header row
      } else {
        // If no explicit header, search first record to find which column looks like an email
        for (let i = 0; i < firstRow.length; i++) {
          if (firstRow[i].includes('@')) {
            emailColIdx = i;
            break;
          }
        }
        if (emailColIdx === -1) emailColIdx = 0; // Default to first column
      }

      for (let r = startRow; r < records.length; r++) {
        const row = records[r];
        const val = row[emailColIdx];
        if (val) {
          rawEntries.push({ row: r + 1, raw: val });
        }
      }
    } catch (err: any) {
      // If CSV parse errors, fallback to line-by-line TXT extraction
      return this.extractFromTxt(content);
    }

    return rawEntries;
  }

  private extractFromTxt(content: string): Array<{ row: number; raw: string }> {
    const lines = content.split(/\r?\n/);
    const rawEntries: Array<{ row: number; raw: string }> = [];
    let currentRow = 1;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // If line contains commas or semicolons (e.g. "a@b.com, c@d.com"), extract each email
      if (trimmed.includes(',') || trimmed.includes(';')) {
        const parts = trimmed.split(/[,;]+/);
        parts.forEach((part) => {
          const p = part.trim();
          if (p) {
            rawEntries.push({ row: currentRow++, raw: p });
          }
        });
      } else {
        rawEntries.push({ row: currentRow++, raw: trimmed });
      }
    });

    return rawEntries;
  }
}

export const leadParserService = new LeadParserService();
