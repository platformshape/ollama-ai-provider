#! /usr/bin/env -S pnpm tsx

import fs from 'node:fs'

import { generateText } from 'ai'
import { ollama } from 'ollama-ai-provider'

import { buildProgram } from '../tools/command'

async function main(model: Parameters<typeof ollama>[0]) {
  const result = await generateText({
    maxOutputTokens: 512,
    messages: [
      {
        content: [
          { text: 'Describe the image in detail.', type: 'text' },
          { image: fs.readFileSync('./data/comic-cat.png'), type: 'image' },
        ],
        role: 'user',
      },
    ],
    model: ollama(model),
  })

  console.log(result.text)
}

buildProgram('llama3.2-vision', main).catch(console.error)
