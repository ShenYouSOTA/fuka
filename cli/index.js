import * as readline from 'readline';
import { FukaBrain } from '../dist/core/FukaBrain.js';

const DEFAULT_USER = 'default_user';

const brain = new FukaBrain({
  name: 'Fuka',
  description: 'QQ AI Agent with social memory',
  model: {
    provider: 'openai',
    name: process.env.MODEL_NAME || 'gpt-4',
    apiKey: process.env.API_KEY || 'mock',
  },
  personality: {
    tone: 'tsundere',
    verbosity: 'medium',
    extraversion: 0.3,
    warmth: 0.6,
  },
  channels: ['cli'],
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  console.log('Fuka CLI - QQ AI Agent');
  console.log('======================');
  console.log('Type a message and press Enter. Type "exit" to quit.\n');

  while (true) {
    const input = await ask('> ');
    const trimmed = input.trim();
    if (!trimmed) continue;
    if (trimmed === 'exit') break;

    try {
      const response = await brain.process({
        userId: DEFAULT_USER,
        content: trimmed,
      });
      console.log(`Fuka: ${response.text}\n`);
    } catch (err) {
      console.error('Error:', err.message);
    }
  }

  rl.close();
  console.log('Bye!');
}

main();
