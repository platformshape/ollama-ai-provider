#! /usr/bin/env -S pnpm tsx

import { streamText } from 'ai'
import { ollama } from 'ollama-ai-provider'

import { buildProgram } from '../tools/command'

async function main(model: Parameters<typeof ollama>[0]) {
  const result = await streamText({
    maxOutputTokens: 1024,
    messages: [
      {
        content: 'Hello!',
        role: 'user',
      },
      {
        content: 'Hello! How can I help you today?',
        role: 'assistant',
      },
      {
        content: 'I need help with my computer.',
        role: 'user',
      },
    ],
    model: ollama(model),
    system: 'You are a helpful chatbot.',
  })

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart)
  }
}

buildProgram('llama3.1', main).catch(console.error)
