import type { Message } from '../types/core.js';
import type { ParsedMessage } from '../types/index.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface LLMConfig {
  provider: string;
  name: string;
  apiKey: string;
}

export interface LLMResponse {
  content: string;
  raw: unknown;
}

export interface CompletionOptions {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export class LLMClient {
  constructor(private config: LLMConfig) {}

  async complete(_options: CompletionOptions): Promise<LLMResponse> {
    return { content: 'mock response', raw: null };
  }

  async parseMessage(message: Message): Promise<ParsedMessage> {
    const content = message.content.toLowerCase();

    let intent: ParsedMessage['intent'] = 'casual';
    if (content.includes('记得') || content.includes('承诺') || content.includes('一定')) {
      intent = 'promise';
    } else if (content.includes('喜欢') || content.includes('兴趣') || content.includes('爱好')) {
      intent = 'interest';
    } else if (content.includes('我是谁') || content.includes('了解我')) {
      intent = 'profile_query';
    }

    return {
      raw: message,
      intent,
      entities: { promises: [], interests: [] },
      confidence: 0.5,
    };
  }

  async generateProfile(_messages: Message[]): Promise<{
    summary: string;
    confidence: number;
    activeHours: Record<string, number>;
    topTopics: string[];
  }> {
    return { summary: 'Mock profile', confidence: 0.5, activeHours: {}, topTopics: [] };
  }

  async extractInterests(_message: Message): Promise<string[]> {
    return [];
  }

  async generate(templateName: string, vars: Record<string, unknown>): Promise<string> {
    const templatePath = resolve(process.cwd(), 'prompts', `${templateName}.md`);
    let template: string;
    try {
      template = readFileSync(templatePath, 'utf-8');
    } catch {
      return `[模板 ${templateName} 未找到]`;
    }
    return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
  }
}
