import type { Message } from '../types/core.js';
import type { FukaConfig, ParsedMessage, FukaResponse } from '../types/index.js';
import { PromiseIntent } from '../types/core.js';
import { LLMClient } from '../llm/client.js';
import { MessagePipeline } from '../pipeline/message.js';
import { MessageStorage } from '../pipeline/storage.js';
import { PromiseTracker, PromiseNotifier, PromiseStorage } from '../modules/PromiseTracker/index.js';
import { InterestTagger, InterestMatcher, InterestNotifier } from '../modules/InterestGraph/index.js';
import { ProfileGenerator, ProfileAnalyzer, ConfidenceCalculator } from '../modules/ProfileGen/index.js';
import { TriggerEngine } from '../trigger/engine.js';

export class FukaBrain {
  private config: FukaConfig;
  private llm: LLMClient;
  private pipeline: MessagePipeline;
  private storage: MessageStorage;
  private trigger: TriggerEngine;
  private promiseTracker: PromiseTracker;
  private promiseStorage: PromiseStorage;
  private promiseNotifier: PromiseNotifier;
  private interestTagger: InterestTagger;
  private interestMatcher: InterestMatcher;
  private interestNotifier: InterestNotifier;

  constructor(config: FukaConfig) {
    this.config = config;
    this.llm = new LLMClient(config.model);
    this.pipeline = new MessagePipeline({});
    this.storage = new MessageStorage();
    this.trigger = new TriggerEngine();
    this.promiseStorage = new PromiseStorage();
    this.promiseNotifier = new PromiseNotifier();
    this.promiseTracker = new PromiseTracker(this.promiseStorage);
    this.interestTagger = new InterestTagger();
    this.interestMatcher = new InterestMatcher();
    this.interestNotifier = new InterestNotifier();
    this.trigger.setDeps(this.promiseStorage, this.promiseNotifier);
  }

  /**
   * Process a message and return a response.
   * Used by CLI for manual message input.
   */
  async process(input: { userId: string; groupId?: string; content: string }): Promise<FukaResponse> {
    const message: Message = {
      id: crypto.randomUUID(),
      userId: input.userId,
      groupId: input.groupId,
      content: input.content,
      timestamp: new Date(),
    };

    // Save to DB
    await this.storage.saveMessage(message);

    // Parse intent
    const parsed = await this.llm.parseMessage(message);

    // Route and handle
    switch (parsed.intent) {
      case 'promise':
        return this.handlePromise(message, parsed);
      case 'interest':
        return this.handleInterest(message, parsed);
      case 'profile_query':
        return this.handleProfileQuery(message, parsed);
      default:
        return this.makeResponse('收到～', 'casual', parsed.confidence);
    }
  }

  async start(): Promise<void> {
    await this.pipeline.start();
    this.pipeline.onMessage(async (msg) => {
      try {
        await this.process({ userId: msg.userId, groupId: msg.groupId, content: msg.content });
      } catch (err) {
        console.error('processMessage error:', err);
      }
    });
    // Start scanning for due promises
    this.trigger.startScanLoop();
  }

  async stop(): Promise<void> {
    await this.pipeline.stop();
    this.trigger.stopScanLoop();
    this.trigger.destroy();
  }

  private async handlePromise(message: Message, parsed: ParsedMessage): Promise<FukaResponse> {
    const intent = parsed.intent === 'promise' ? PromiseIntent.CREATE : PromiseIntent.DEFER_CHOICE;

    const result = await this.promiseTracker.handle({
      intent,
      userMessage: message.content,
      userId: message.userId,
    });

    switch (result.type) {
      case '追问':
        return this.makeResponse(result.question, 'promise', parsed.confidence);
      case '完成':
        return this.makeResponse(`记住了，我会提醒你的～`, 'promise', parsed.confidence);
      case '摘要':
        return this.makeResponse(result.summary, 'promise', parsed.confidence);
      case '冲突询问':
        return this.makeResponse(result.conflictMessage, 'promise_conflict', parsed.confidence);
      case '错误':
        return this.makeResponse(result.message, 'promise_error', 0.5);
    }
  }

  private async handleInterest(message: Message, parsed: ParsedMessage): Promise<FukaResponse> {
    const tags = await this.interestTagger.extract(message);
    if (tags.length === 0) {
      return this.makeResponse('没识别到兴趣点～', 'interest', parsed.confidence);
    }

    const topTag = tags.reduce((a, b) => (a.weight > b.weight ? a : b));
    const matches = await this.interestMatcher.findMatches(
      message.groupId ?? 'default',
      message.userId
    );

    if (matches.length === 0) {
      return this.makeResponse(
        `哦？你对「${topTag.topic}」感兴趣啊～`,
        'interest',
        parsed.confidence
      );
    }

    const match = matches[0];
    return this.makeResponse(
      `发现你们都喜欢「${match.sharedTopics.join('、')}」～要不要认识一下？`,
      'interest_match',
      parsed.confidence
    );
  }

  private async handleProfileQuery(message: Message, parsed: ParsedMessage): Promise<FukaResponse> {
    const targetPerson = parsed.entities.targetPerson ?? message.userId;
    return this.makeResponse(
      `让我想想「${targetPerson}」是什么样的人～`,
      'profile_query',
      parsed.confidence
    );
  }

  private makeResponse(text: string, intent: string, confidence: number): FukaResponse {
    return {
      text,
      actions: [],
      metadata: { intent, confidence, processingTime: 0 },
    };
  }
}
