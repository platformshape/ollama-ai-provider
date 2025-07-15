#! /usr/bin/env -S pnpm tsx

import { streamText, wrapLanguageModel as wrapLanguageModel } from 'ai'
import { ollama } from 'ollama-ai-provider'

import { buildProgram } from '../tools/command'
import { yourLogMiddleware } from './your-log-middleware'

async function main(model: Parameters<typeof ollama>[0]) {
  const result = await streamText({
    model: wrapLanguageModel({
      middleware: yourLogMiddleware,
      model: ollama(model),
    }),
    prompt: 'What cities are in the United States?',
  })

  for await (const textPart of result.textStream) {
    // consume the stream
  }
}

buildProgram('llama3.1', main).catch(console.error)
