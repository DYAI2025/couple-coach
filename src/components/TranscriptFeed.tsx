import React from 'react';
import { InteractionMessage } from '../types';

interface TranscriptFeedProps {
  messages: InteractionMessage[];
  activePhaseSpeaker: string;
  partnerAName: string;
  partnerBName: string;
  onChangeSpeaker: (index: number, speaker: 'partnerA' | 'partnerB') => void;
  onTranslate: (index: number, lang: string) => void;
}

export const TranscriptFeed: React.FC<TranscriptFeedProps> = ({ 
  messages, 
  activePhaseSpeaker, 
  partnerAName, 
  partnerBName,
  onChangeSpeaker,
  onTranslate
}) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-10 opacity-60">
        <p className="text-white text-xs font-bold font-mono">Bereit zum Mitschreiben</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => {
        const isPartnerA = msg.speaker === 'partnerA';
        const isActive = activePhaseSpeaker === msg.speaker;

        return (
          <div
            key={idx}
            className={`group p-4 rounded-2xl border transition-all duration-300 relative flex flex-col space-y-2.5 ${
              isPartnerA 
                ? 'bg-emerald-950/[0.03] border-emerald-500/10 hover:border-emerald-500/20' 
                : 'bg-amber-950/[0.03] border-amber-500/10 hover:border-amber-500/20'
            } ${isActive ? 'ring-2 ring-emerald-500/30' : ''}`}
          >
            {/* The rest of the message content logic */}
            {/* I will keep the original content here after refinement */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center space-x-1">
                <span className={`w-2 h-2 rounded-full mr-1.5 ${isPartnerA ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <select
                  value={msg.speaker}
                  onChange={(e) => onChangeSpeaker(idx, e.target.value as 'partnerA' | 'partnerB')}
                  className="bg-transparent text-white font-bold outline-none border-b border-dashed border-white/10 hover:border-white/30 pb-0.5 text-xs font-mono cursor-pointer transition py-0"
                  title="Sprecher Diarisierungs-Zuordnung korrigieren"
                >
                  <option value="partnerA">{partnerAName}</option>
                  <option value="partnerB">{partnerBName}</option>
                </select>
                <span className="text-slate-500 font-mono text-[9.5px] pl-1">{msg.timestamp}</span>
              </div>
            </div>
            <p className="text-sm text-slate-300">{msg.text}</p>
          </div>
        );
      })}
    </div>
  );
};
