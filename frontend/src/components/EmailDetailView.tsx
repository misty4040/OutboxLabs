import React, { useState } from 'react';
import { ArrowLeft, Star, Trash2, Archive, ChevronDown, Download } from 'lucide-react';
import { EmailJob } from '../types';

interface EmailDetailViewProps {
  email: EmailJob;
  onBack: () => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({ email, onBack }) => {
  const [isStarred, setIsStarred] = useState(false);

  const formattedDate = email.sentAt
    ? new Date(email.sentAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : new Date(email.scheduledAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

  const senderInitial = (email.recipient.charAt(0) || 'O').toUpperCase();

  return (
    <div className="flex-1 flex flex-col bg-[#FFFFFF] min-h-full font-sans">
      {/* Top Header */}
      <div className="px-8 py-5 border-b border-[#D8D2C9] bg-[#FAF8F5] flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-hidden">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-[#D8D2C9] bg-[#FFFFFF] hover:bg-[#EBE7E0] text-[#111111] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="truncate">
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#8C867E] block font-mono">
              EMAIL INSPECTION
            </span>
            <h2 className="text-base font-bold text-[#111111] truncate">
              {email.subject}{' '}
              <span className="text-[#8C867E] font-normal font-mono text-xs">
                | ID: {email.id.slice(0, 8)}
              </span>
            </h2>
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2 text-[#5F5A54]">
          <button
            onClick={() => setIsStarred(!isStarred)}
            className="p-2 rounded-lg border border-[#D8D2C9] bg-[#FFFFFF] hover:bg-[#EBE7E0] hover:text-[#111111] transition-colors cursor-pointer"
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isStarred ? 'fill-[#111111] text-[#111111]' : 'text-[#8C867E]'
              }`}
            />
          </button>
          <button
            title="Archive"
            className="p-2 rounded-lg border border-[#D8D2C9] bg-[#FFFFFF] hover:bg-[#EBE7E0] hover:text-[#111111] transition-colors cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            title="Delete"
            className="p-2 rounded-lg border border-[#ECD1C5] bg-[#FBF2EE] hover:bg-[#F5E2DA] text-[#9E3618] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Email Body Content Area */}
      <div className="flex-1 p-10 overflow-y-auto max-w-3xl space-y-8">
        {/* Sender Line */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-[#EBE7E0]">
          <div className="flex items-center gap-3.5">
            {/* Near-Black Avatar */}
            <div className="w-9 h-9 rounded-full bg-[#111111] text-[#F4F1EC] font-bold text-xs flex items-center justify-center shrink-0 border border-[#111111]">
              {senderInitial}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#111111] text-sm">
                  {email.recipient.split('@')[0]}
                </span>
                <span className="text-xs text-[#8C867E] font-mono">&lt;{email.recipient}&gt;</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#5F5A54] mt-0.5">
                <span>to outbound receiver</span>
                <ChevronDown className="w-3 h-3 text-[#8C867E]" />
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-mono text-[#8C867E]">{formattedDate}</span>
          </div>
        </div>

        {/* Message Content (Editorial Typography) */}
        <div className="text-sm text-[#111111] leading-relaxed space-y-5 font-sans">
          <p className="whitespace-pre-line leading-relaxed">{email.body}</p>

          {/* Editorial Highlight Callout Box */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#D8D2C9] text-[#111111] space-y-2 text-xs leading-relaxed">
            <p className="font-bold tracking-tight text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
              Campaign Performance Note & Call to Action
            </p>
            <p className="text-[#5F5A54]">
              Dispatched with automated delay spacing to maintain recipient server trust and avoid SPF/DKIM throttling.
            </p>
          </div>

          <div className="pt-3 text-[#5F5A54]">
            <p>Respectfully,</p>
            <p className="font-semibold text-[#111111] mt-1">ReachInbox Team</p>
          </div>
        </div>

        {/* Attachments Section */}
        <div className="pt-8 border-t border-[#EBE7E0]">
          <p className="text-xs font-bold font-mono uppercase tracking-wider text-[#8C867E] mb-4">
            2 Campaign Assets Attached
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="w-52 rounded-xl border border-[#D8D2C9] overflow-hidden bg-[#FAF8F5] hover:border-[#111111] transition-colors">
              <div className="h-20 bg-[#EBE7E0] flex items-center justify-center text-[#5F5A54] text-xs font-mono">
                Asset_Spec_1.pdf
              </div>
              <div className="p-3 bg-[#FFFFFF] border-t border-[#D8D2C9] flex items-center justify-between">
                <div className="truncate pr-2">
                  <p className="text-[11px] font-semibold text-[#111111] truncate">
                    Outreach_Brief.pdf
                  </p>
                  <p className="text-[10px] text-[#8C867E] font-mono">1.2 MB</p>
                </div>
                <Download className="w-3.5 h-3.5 text-[#5F5A54] hover:text-[#111111] cursor-pointer" />
              </div>
            </div>

            <div className="w-52 rounded-xl border border-[#D8D2C9] overflow-hidden bg-[#FAF8F5] hover:border-[#111111] transition-colors">
              <div className="h-20 bg-[#EBE7E0] flex items-center justify-center text-[#5F5A54] text-xs font-mono">
                Asset_Spec_2.pdf
              </div>
              <div className="p-3 bg-[#FFFFFF] border-t border-[#D8D2C9] flex items-center justify-between">
                <div className="truncate pr-2">
                  <p className="text-[11px] font-semibold text-[#111111] truncate">
                    Sequencing_Plan.pdf
                  </p>
                  <p className="text-[10px] text-[#8C867E] font-mono">840 KB</p>
                </div>
                <Download className="w-3.5 h-3.5 text-[#5F5A54] hover:text-[#111111] cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
