import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface PersonalityOverride {
  tone?: string;
  verbosity?: string;
  extraversion?: number;
  warmth?: number;
}

export class PromptManager {
  private defaultPersonality: string;

  constructor() {
    this.defaultPersonality = readFileSync(
      join(__dirname, '../../prompts/fuka-default.md'),
      'utf-8'
    );
  }

  merge(userOverride?: PersonalityOverride): string {
    // TODO: implement merge logic
    return this.defaultPersonality;
  }
}
