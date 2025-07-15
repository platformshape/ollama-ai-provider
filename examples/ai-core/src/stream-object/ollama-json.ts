#! /usr/bin/env -S pnpm tsx

import { streamObject } from 'ai'
import { ollama } from 'ollama-ai-provider'
import { z } from 'zod'

import { buildProgram } from '../tools/command'

async function main(model: Parameters<typeof ollama>[0]) {
  const result = streamObject({
    maxOutputTokens: 2000,
    mode: 'json',
    model: ollama(model),
    prompt:
      'Generate 3 character descriptions for a fantasy role playing game.',
    schema: z.object({
      characters: z.array(
        z.object({
          class: z
            .string()
            .describe('Character class, e.g. warrior, mage, or thief.'),
          description: z.string(),
          name: z.string(),
        }),
      ),
    }),
  })

  for await (const partialObject of result.partialObjectStream) {
    console.clear()
    console.log(partialObject)
  }
}

buildProgram('llama3.1', main).catch(console.error)
