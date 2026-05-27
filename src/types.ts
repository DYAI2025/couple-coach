/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Speaker {
  name: string;
  role: 'partnerA' | 'partnerB';
  color: string;
}

export interface Phase {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  speaker: 'partnerA' | 'partnerB' | 'both' | 'none';
}

export interface SessionTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  phases: Phase[];
}

export interface InteractionMessage {
  speaker: 'partnerA' | 'partnerB';
  text: string;
  timestamp: string; // MM:SS relative time or absolute time
  translation?: string;
  translationLang?: string;
}

export interface AIAnalysis {
  ichBotschaftenScore: {
    partnerA: number; // 0-100 indicating percentage of self-reflexive speech
    partnerB: number;
  };
  keyThemes: string[];
  summary: string;
  appreciationHighlights: {
    partnerA: string[];
    partnerB: string[];
  };
  actionableTips: string[];
}

export interface SessionResult {
  id: string;
  date: string;
  templateId: string;
  templateName: string;
  partnerA_Name: string;
  partnerB_Name: string;
  transcriptA: string;
  transcriptB: string;
  messages: InteractionMessage[];
  durationMinutesTotal: number;
  analysis?: AIAnalysis;
}
