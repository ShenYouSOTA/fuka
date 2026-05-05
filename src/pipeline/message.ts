import type { Message } from '../types/core.js';
import type { ParsedMessage } from '../types/index.js';

export interface MessagePipelineConfig {
  qqBotToken?: string;
}

export class MessagePipeline {
  constructor(config: MessagePipelineConfig) {
    // TODO: initialize QQ bot connection
  }

  async start(): Promise<void> {
    // TODO: start listening to QQ messages
    throw new Error('Not implemented');
  }

  async stop(): Promise<void> {
    // TODO: stop listening
    throw new Error('Not implemented');
  }

  onMessage(handler: (message: Message) => void): void {
    // TODO: register message handler
  }

  async sendMessage(target: string, content: string): Promise<void> {
    // TODO: send message via QQ
    throw new Error('Not implemented');
  }
}

class MessageParser {
  parse(raw: Message): ParsedMessage {
    // TODO: implement with LLM
    throw new Error('Not implemented');
  }

  extractIntent(content: string): string {
    // TODO: implement
    throw new Error('Not implemented');
  }
}
