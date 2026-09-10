import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  Quote,
  Link,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { campaignApi } from '../api/client';
import { LeadParseResult } from '../types';

interface ComposeModalProps {
  isOpen: boolean;
  userEmail: string;
  onClose: () => void;
  onCampaignCreated: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  userEmail,
  onClose,
  onCampaignCreated,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [startTime, setStartTime] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [recipientsList, setRecipientsList] = useState<string[]>([]);
  const [parseResult, setParseResult] = useState<LeadParseResult | null>(null);
  const [showSendLaterPopover, setShowSendLaterPopover] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setParsing(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);
        const res = await campaignApi.parseLeads(formData);
        setParseResult(res);
        setRecipientsList(res.validRecipients);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to parse file');
      } finally {
        setParsing(false);
      }
    }
  };

  const handleManualEmailBlur = async () => {
    if (!manualInput.trim()) return;
    try {
      setParsing(true);
      setError(null);
      const formData = new FormData();
      formData.append('rawText', manualInput);
      const res = await campaignApi.parseLeads(formData);
      setParseResult(res);
      setRecipientsList(res.validRecipients);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to parse emails');
    } finally {
      setParsing(false);
    }
  };

  const handleApplyPresetTime = (_hoursFromNow: number, targetHour?: number) => {
    const d = new Date();
    if (targetHour !== undefined) {
      d.setDate(d.getDate() + 1);
      d.setHours(targetHour, 0, 0, 0);
    } else {
      d.setDate(d.getDate() + 1);
    }
    // Format to YYYY-MM-DDTHH:mm for datetime-local input
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
    setStartTime(formatted);
    setShowSendLaterPopover(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let recipients = [...recipientsList];
    if (recipients.length === 0 && parseResult?.validRecipients?.length) {
      recipients = parseResult.validRecipients;
    }
    if (recipients.length === 0 && manualInput.trim()) {
      recipients = manualInput
        .split(/[\n,;]+/)
        .map((e) => e.trim())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    }

    if (recipients.length === 0) {
      setError('Please provide at least one valid recipient email address (upload CSV or paste emails)');
      return;
    }

    try {
      setSubmitting(true);
      await campaignApi.createCampaign({
        subject: subject.trim() || '(No Subject)',
        body: body.trim() || 'Hello, reaching out regarding our project.',
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        delayBetweenEmailsMs: Number(delaySeconds) * 1000,
        hourlyLimit: Number(hourlyLimit),
        recipients,
      });

      onCampaignCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to schedule campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto font-sans selection:bg-[#111111] selection:text-[#F4F1EC]">
      <div className="bg-[#FFFFFF] rounded-2xl w-full max-w-2xl shadow-xl border border-[#D8D2C9] overflow-hidden my-6 text-xs text-[#111111]">
        {/* Top Header Bar */}
        <div className="px-8 py-5 border-b border-[#D8D2C9] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#D8D2C9] bg-[#FFFFFF] hover:bg-[#EBE7E0] text-[#111111] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#8C867E] block font-mono">
                OUTREACH DISPATCH
              </span>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">Compose New Campaign</h2>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Send Later Clock Icon */}
            <button
              type="button"
              onClick={() => setShowSendLaterPopover(!showSendLaterPopover)}
              title="Schedule / Send Later"
              className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
                startTime
                  ? 'border-[#111111] bg-[#111111] text-[#F4F1EC]'
                  : 'border-[#D8D2C9] bg-[#FFFFFF] hover:bg-[#EBE7E0] text-[#5F5A54]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono font-medium">
                {startTime ? 'Delayed' : 'Send Later'}
              </span>
            </button>

            {/* Primary Action Button: Near-black with warm-white text */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#141414] hover:bg-[#262626] active:bg-[#000000] text-[#F4F1EC] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 border border-[#141414]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enqueuing...</span>
                </>
              ) : startTime ? (
                <span>Schedule Campaign</span>
              ) : (
                <span>Dispatch Campaign</span>
              )}
            </button>

            {/* Editorial Send Later Popover Dropdown */}
            {showSendLaterPopover && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#D8D2C9] p-5 z-50 text-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EBE7E0]">
                  <span className="font-bold text-[#111111] text-xs font-mono uppercase tracking-wider">
                    Schedule Send Window
                  </span>
                  <button
                    onClick={() => setShowSendLaterPopover(false)}
                    className="text-[#8C867E] hover:text-[#111111]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-[#5F5A54] mb-1.5 font-mono uppercase">
                    Pick exact start date & time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8D2C9] text-xs focus:border-[#111111] focus:outline-none bg-[#FAF8F5]"
                  />
                </div>

                {/* Quick Presets */}
                <div className="space-y-1 text-[#5F5A54]">
                  <p className="text-[10px] text-[#8C867E] uppercase font-mono tracking-wider mb-1">
                    Quick Presets
                  </p>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(24)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] transition-colors font-medium text-xs"
                  >
                    Tomorrow, Same Time
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(24, 10)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] transition-colors font-medium text-xs"
                  >
                    Tomorrow at 10:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(24, 15)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] transition-colors font-medium text-xs"
                  >
                    Tomorrow at 3:00 PM
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBE7E0]">
                  <button
                    type="button"
                    onClick={() => {
                      setStartTime('');
                      setShowSendLaterPopover(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[#5F5A54] hover:text-[#111111] text-xs"
                  >
                    Clear Delay
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSendLaterPopover(false)}
                    className="px-4 py-1.5 rounded-xl bg-[#141414] text-[#F4F1EC] hover:bg-[#262626] font-semibold text-xs"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-6 p-3 rounded-xl bg-[#FBF2EE] border border-[#ECD1C5] text-[#9E3618] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="divide-y divide-[#EBE7E0]">
          {/* From Field */}
          <div className="px-8 py-3.5 flex items-center gap-4">
            <label className="w-20 text-[#8C867E] font-mono text-[11px] uppercase tracking-wider">
              From
            </label>
            <div className="flex-1 flex items-center justify-between">
              <span className="font-semibold text-[#111111] font-mono text-xs">{userEmail}</span>
              <span className="text-[10px] text-[#8C867E] font-mono uppercase tracking-wider">Authenticated</span>
            </div>
          </div>

          {/* To Field & Minimal Drop Zone */}
          <div className="px-8 py-4 space-y-3">
            <div className="flex items-start gap-4">
              <label className="w-20 text-[#8C867E] font-mono text-[11px] uppercase tracking-wider pt-2">
                To Leads
              </label>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onBlur={handleManualEmailBlur}
                  placeholder="Paste emails directly (e.g. sarah@cyberdyne.io, alex@reachinbox.ai)"
                  className="w-full text-xs text-[#111111] placeholder-[#8C867E] px-3.5 py-2.5 rounded-xl border border-[#D8D2C9] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#111111] focus:outline-none transition-colors"
                />

                {/* Minimal File Drop Zone */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-[#D8D2C9] rounded-xl p-4 text-center hover:border-[#111111] bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[11px] font-bold tracking-wider uppercase text-[#111111] font-mono group-hover:underline">
                      DROP LEAD FILE HERE (CSV or TXT)
                    </p>
                    <p className="text-[10px] text-[#8C867E]">
                      or click to browse local leads list
                    </p>
                  </div>
                </div>

                {/* Recipient Diagnostics & Chips */}
                {parsing && (
                  <div className="flex items-center gap-2 text-[#111111] text-[11px] py-1 font-mono">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#111111]" />
                    <span>Parsing lead syntax...</span>
                  </div>
                )}

                {parseResult && (
                  <div className="mt-2 p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C9] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {parseResult.validRecipients.slice(0, 3).map((r, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#D8D2C9] text-[#111111] text-[11px] font-mono"
                        >
                          {r}
                        </span>
                      ))}
                      {parseResult.validRecipients.length > 3 && (
                        <span className="px-2 py-0.5 rounded-md bg-[#EBE7E0] text-[#111111] text-[10px] font-mono font-bold">
                          +{parseResult.validRecipients.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#111111] font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {parseResult.validCount} EMAILS DETECTED
                      </span>
                      {parseResult.invalidCount > 0 && (
                        <span className="text-[#9E3618] font-mono text-[11px]">
                          {parseResult.invalidCount} Invalid Skipped
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subject Field */}
          <div className="px-8 py-3.5 flex items-center gap-4">
            <label className="w-20 text-[#8C867E] font-mono text-[11px] uppercase tracking-wider">
              Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scaling outbound outreach pipeline with ReachInbox"
              className="flex-1 text-xs text-[#111111] placeholder-[#8C867E] px-3 py-2 rounded-xl border border-[#D8D2C9] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#111111] focus:outline-none transition-colors"
            />
          </div>

          {/* Sending Controls: Delay & Hourly Limit */}
          <div className="px-8 py-3.5 flex flex-wrap items-center gap-8 bg-[#FAF8F5] text-xs">
            <div className="flex items-center gap-2.5">
              <label className="text-[#5F5A54] font-medium">Delay between emails</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 rounded-lg border border-[#D8D2C9] text-center font-mono font-bold text-xs focus:outline-none focus:border-[#111111] bg-[#FFFFFF]"
                />
                <span className="text-[#8C867E] font-mono text-[11px]">sec</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <label className="text-[#5F5A54] font-medium">Hourly Limit</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 rounded-lg border border-[#D8D2C9] text-center font-mono font-bold text-xs focus:outline-none focus:border-[#111111] bg-[#FFFFFF]"
                />
                <span className="text-[#8C867E] font-mono text-[11px]">/hr</span>
              </div>
            </div>

            {startTime && (
              <div className="flex items-center gap-1.5 text-[#111111] bg-[#EBE7E0] px-3 py-1 rounded-full text-[11px] font-mono font-medium border border-[#D8D2C9]">
                <Clock className="w-3 h-3" />
                <span>Starts: {new Date(startTime).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Minimal Formatting Toolbar */}
          <div className="px-8 py-2 border-t border-b border-[#D8D2C9] flex flex-wrap items-center gap-1 text-[#5F5A54] bg-[#FFFFFF]">
            <button type="button" className="p-1.5 rounded hover:bg-[#EBE7E0] hover:text-[#111111]">
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1.5 rounded hover:bg-[#EBE7E0] hover:text-[#111111]">
              <Redo className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-[#D8D2C9] mx-1.5" />
            <button type="button" className="p-1.5 rounded hover:bg-[#EBE7E0] hover:text-[#111111]">
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1.5 rounded hover:bg-[#EBE7E0] hover:text-[#111111]">
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1.5 rounded hover:bg-[#EBE7E0] hover:text-[#111111]">
              <Underline className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-[#D8D2C9] mx-1.5" />
            <button type="button" className="p-1.5 rounded hover:bg-[#EBE7E0] hover:text-[#111111]">
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1.5 rounded hover:bg-[#EBE7E0] hover:text-[#111111]">
              <List className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1.5 rounded hover:bg-[#EBE7E0] hover:text-[#111111]">
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1.5 rounded hover:bg-[#EBE7E0] hover:text-[#111111]">
              <Link className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Email Body Writing Area */}
          <div className="px-8 py-6 bg-[#FFFFFF]">
            <textarea
              rows={8}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Draft your cold outreach sequence message here..."
              className="w-full bg-transparent text-sm text-[#111111] placeholder-[#8C867E] focus:outline-none resize-none leading-relaxed font-sans"
            />
          </div>
        </form>
      </div>
    </div>
  );
};
