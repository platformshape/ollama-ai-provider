#! /usr/bin/env -S pnpm tsx

import { LanguageModelUsage, streamObject } from 'ai'
import { ollama } from 'ollama-ai-provider'
import { z } from 'zod'

import { buildProgram } from '../tools/command'

async function main(model: Parameters<typeof ollama>[0]) {
  const result = streamObject({
    model: ollama(model),
    prompt: 'Generate a lasagna recipe with two ingredients.',
    schema: z.object({
      recipe: z.object({
        ingredients: z.array(z.string()),
        name: z.string(),
        steps: z.array(z.string()),
      }),
    }),
  })

  // use as promise:
  result.usage.then(recordTokenUsage)

  // note: the stream needs to be consumed because of backpressure
  for await (const partialObject of result.partialObjectStream) {
  }
}

// your custom function to record token usage:
function recordTokenUsage(usage: LanguageModelUsage) {
  console.log('Input tokens:', usage.inputTokens)
  console.log('Cached input tokens:', usage.cachedInputTokens)
  console.log('Reasoning tokens:', usage.reasoningTokens)
  console.log('Output tokens:', usage.outputTokens)
  console.log('Total tokens:', usage.totalTokens)
}

buildProgram('llama3.1', main).catch(console.error)
