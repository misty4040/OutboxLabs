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
    <div className="flex-1 flex flex-col bg-white min-h-full">
      {/* Top Header matching Figma */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold text-gray-900 truncate">
            {email.subject} <span className="text-gray-400 font-normal">| ID:{email.id.slice(0, 8)}</span>
          </h2>
        </div>

        {/* Action Icons matching Figma */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <button
            onClick={() => setIsStarred(!isStarred)}
            className="p-2 rounded-lg hover:bg-gray-100 hover:text-amber-500 transition cursor-pointer"
          >
            <Star
              className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`}
            />
          </button>
          <button
            title="Archive"
            className="p-2 rounded-lg hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            title="Delete"
            className="p-2 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Email Body Content Area */}
      <div className="flex-1 p-8 overflow-y-auto max-w-3xl space-y-6">
        {/* Sender Line */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Figma Green Avatar */}
            <div className="w-9 h-9 rounded-full bg-[#00A859] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
              {senderInitial}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">
                  {email.recipient.split('@')[0]}
                </span>
                <span className="text-xs text-gray-400">&lt;{email.recipient}&gt;</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <span>to me</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs text-gray-400">{formattedDate}</span>
          </div>
        </div>

        {/* Message Content */}
        <div className="text-xs text-gray-800 leading-relaxed space-y-4 pt-2">
          <p className="whitespace-pre-line">{email.body}</p>

          {/* Figma Yellow Highlight Callout Box */}
          <div className="p-4 rounded-xl bg-[#FEF9C3] border border-[#FDE047]/60 text-[#854D0E] space-y-1 text-xs">
            <p className="font-semibold flex items-center gap-1.5">
              <span>⚡</span> Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment <span>⚡</span>
            </p>
            <p>
              ⚡ To explore securing your private transformation, simply reply right now with <strong className="underline">"FLY OUT FIX"</strong>.
            </p>
          </div>

          <div className="pt-2 text-gray-600">
            <p>Your coach for world-class performance,</p>
            <p className="font-semibold text-gray-900">Grant</p>
          </div>

          <p className="text-[11px] text-gray-400 italic">
            P.S. Always remember that you can develop world class technique! 🚀
          </p>
        </div>

        {/* Figma Attachment Cards */}
        <div className="pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-3">2 Attachments</p>
          <div className="flex flex-wrap gap-3">
            <div className="w-48 rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:border-gray-300 transition">
              <div className="h-24 bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
                🎾 Tennis_Coach_Profile.png
              </div>
              <div className="p-2.5 bg-white flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-gray-800 truncate">
                    Tennis_Coach_Profile.png
                  </p>
                  <p className="text-[10px] text-gray-400">1.2 MB</p>
                </div>
                <Download className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700 cursor-pointer" />
              </div>
            </div>

            <div className="w-48 rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:border-gray-300 transition">
              <div className="h-24 bg-gradient-to-tr from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-semibold">
                🎾 Tennis_Coach_Profile2.png
              </div>
              <div className="p-2.5 bg-white flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-gray-800 truncate">
                    Tennis_Coach_Profile2.png
                  </p>
                  <p className="text-[10px] text-gray-400">1.2 MB</p>
                </div>
                <Download className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700 cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
