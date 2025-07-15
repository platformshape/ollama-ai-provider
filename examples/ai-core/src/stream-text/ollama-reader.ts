#! /usr/bin/env -S pnpm tsx

import { streamText } from 'ai'
import { ollama } from 'ollama-ai-provider'

import { buildProgram } from '../tools/command'

async function main(model: Parameters<typeof ollama>[0]) {
  const result = await streamText({
    maxOutputTokens: 512,
    maxRetries: 5,
    model: ollama(model),
    prompt: 'Invent a new holiday and describe its traditions.',
    temperature: 0.3,
  })

  const reader = result.textStream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    process.stdout.write(value)
  }
}

buildProgram('llama3.1', main).catch(console.error)
