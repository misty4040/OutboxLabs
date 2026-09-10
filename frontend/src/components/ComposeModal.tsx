import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Link,
  Strikethrough,
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

    const recipients = recipientsList.length > 0 ? recipientsList : parseResult?.validRecipients || [];

    if (recipients.length === 0) {
      setError('Please provide at least one recipient email address (upload list or paste emails)');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-200/80 overflow-hidden my-6 text-xs text-gray-800">
        {/* Top Header Bar matching Figma */}
        <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-gray-900">Compose New Email</h2>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              type="button"
              title="Attach File"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Figma Send Later Clock Icon */}
            <button
              type="button"
              onClick={() => setShowSendLaterPopover(!showSendLaterPopover)}
              title="Send Later"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Send / Send Later Action Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-1.5 rounded-full border border-[#00A859] text-[#00A859] hover:bg-[#E6F4EA] font-semibold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : startTime ? (
                <span>Send Later</span>
              ) : (
                <span>Send</span>
              )}
            </button>

            {/* Figma Send Later Popover Dropdown */}
            {showSendLaterPopover && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-50 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="font-bold text-gray-900 text-xs">Send Later</span>
                  <button
                    onClick={() => setShowSendLaterPopover(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Pick date & time</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1 text-gray-700">
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(24)}
                    className="w-full text-left px-2 py-1 rounded-lg hover:bg-gray-50 transition"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(24, 10)}
                    className="w-full text-left px-2 py-1 rounded-lg hover:bg-gray-50 transition"
                  >
                    Tomorrow, 10:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(24, 11)}
                    className="w-full text-left px-2 py-1 rounded-lg hover:bg-gray-50 transition"
                  >
                    Tomorrow, 11:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(24, 15)}
                    className="w-full text-left px-2 py-1 rounded-lg hover:bg-gray-50 transition"
                  >
                    Tomorrow, 3:00 PM
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setStartTime('');
                      setShowSendLaterPopover(false);
                    }}
                    className="px-3 py-1 rounded-lg text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSendLaterPopover(false)}
                    className="px-3 py-1 rounded-lg border border-[#00A859] text-[#00A859] hover:bg-[#E6F4EA] font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
          {/* From Field */}
          <div className="px-6 py-2.5 flex items-center gap-4">
            <label className="w-24 text-gray-400 font-medium">From</label>
            <div className="flex-1 flex items-center justify-between">
              <span className="font-semibold text-gray-800">{userEmail}</span>
            </div>
          </div>

          {/* To Field with Upload List */}
          <div className="px-6 py-2.5 flex items-start gap-4">
            <label className="w-24 text-gray-400 font-medium pt-1.5">To</label>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onBlur={handleManualEmailBlur}
                  placeholder="recipient@example.com (or comma-separated)"
                  className="flex-1 text-xs text-gray-800 placeholder-gray-400 focus:outline-none py-1"
                />

                {/* Figma Upload List Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-700 hover:bg-emerald-50 transition cursor-pointer font-medium shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload List</span>
                </button>
              </div>

              {/* Recipient Chips & Validation Diagnostics */}
              {parsing && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] py-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Parsing lead addresses...</span>
                </div>
              )}

              {parseResult && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {parseResult.validRecipients.slice(0, 3).map((r, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium"
                      >
                        {r}
                      </span>
                    ))}
                    {parseResult.validRecipients.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#008744] text-[10px] font-bold">
                        +{parseResult.validRecipients.length - 3}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 ml-auto">
                    <CheckCircle2 className="w-3 h-3" />
                    {parseResult.validCount} Valid
                  </span>
                  {parseResult.invalidCount > 0 && (
                    <span className="text-[11px] text-rose-500 font-medium">
                      {parseResult.invalidCount} Invalid Skipped
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Subject Field */}
          <div className="px-6 py-2.5 flex items-center gap-4">
            <label className="w-24 text-gray-400 font-medium">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 text-xs text-gray-800 placeholder-gray-400 focus:outline-none py-1"
            />
          </div>

          {/* Sending Controls: Delay & Hourly Limit */}
          <div className="px-6 py-2.5 flex flex-wrap items-center gap-6 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <label className="text-gray-500 font-medium">Delay between 2 emails</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-14 px-2 py-1 rounded-lg border border-gray-200 text-center font-semibold text-xs focus:outline-none focus:border-emerald-500 bg-white"
                />
                <span className="text-gray-400 text-[11px]">sec</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-gray-500 font-medium">Hourly Limit</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-14 px-2 py-1 rounded-lg border border-gray-200 text-center font-semibold text-xs focus:outline-none focus:border-emerald-500 bg-white"
                />
                <span className="text-gray-400 text-[11px]">/hr</span>
              </div>
            </div>

            {startTime && (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-medium border border-amber-200">
                <Clock className="w-3 h-3" />
                <span>Starts: {new Date(startTime).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Rich Text Toolbar matching Figma */}
          <div className="px-6 py-2 border-t border-b border-gray-100 flex flex-wrap items-center gap-1 text-gray-400 bg-white">
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <Redo className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-gray-200 mx-1" />
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded hover:bg-gray-100 hover:text-gray-700 cursor-pointer">
              TT
            </span>
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <Underline className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-gray-200 mx-1" />
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <List className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <Link className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1 rounded hover:bg-gray-100 hover:text-gray-700">
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Email Body Editor */}
          <div className="px-6 py-4 bg-[#F9FAFB]/50">
            <textarea
              rows={8}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type Your Reply..."
              className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none resize-none leading-relaxed font-sans"
            />
          </div>
        </form>
      </div>
    </div>
  );
};
