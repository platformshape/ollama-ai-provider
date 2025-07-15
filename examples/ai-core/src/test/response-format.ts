#! /usr/bin/env -S pnpm tsx

import { ollama } from 'ollama-ai-provider'

import { buildProgram } from '../tools/command'

async function main(model: Parameters<typeof ollama>[0]) {
  const result = await ollama(model, {
    experimentalStreamTools: false,
  }).doStream({
    prompt: [
      {
        content: [
          {
            text: 'Invent a new holiday and describe its traditions. Output as JSON object.',
            type: 'text',
          },
        ],
        role: 'user',
      },
    ],
    responseFormat: {
      schema: {
        properties: {
          text: { type: 'string' },
        },
        required: ['text'],
        type: 'object',
      },
      type: 'json',
    },
    temperature: 0,
  })

  const reader = result.stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    if (value.type === 'text-delta') {
      process.stdout.write(value.delta)
    }
  }
}

buildProgram('llama3.1', main).catch(console.error)
