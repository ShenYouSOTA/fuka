import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { LLMClient } from '../src/llm/client.js';
import { MessagePipeline } from '../src/pipeline/message.js';

export default definePluginEntry({
  id: 'fuka',
  name: 'Fuka',
  description: 'QQ AI Agent with social memory - promise tracking, interest graph, and user profiling',
  configSchema: {
    type: 'object',
    properties: {
      qqBotToken: { type: 'string' },
    },
    additionalProperties: false,
  },
  register(api) {
    const llmClient = new LLMClient({
      provider: process.env.LLM_PROVIDER || 'openai',
      name: process.env.LLM_MODEL_NAME || 'gpt-4',
      apiKey: process.env.API_KEY || '',
    });

    api.registerProvider({
      name: 'fuka-llm',
      description: 'Fuka LLM client for intent parsing and content generation',
      client: llmClient,
    });

    const pipeline = new MessagePipeline({ qqBotToken: process.env.QQ_BOT_TOKEN });
    api.registerChannel({
      name: 'fuka-message',
      description: 'Fuka message pipeline for QQ messages',
      pipeline,
    });
  },
});