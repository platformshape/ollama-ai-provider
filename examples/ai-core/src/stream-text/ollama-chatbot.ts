#! /usr/bin/env -S pnpm tsx

import * as readline from 'node:readline/promises'

import { ModelMessage, stepCountIs, streamText, tool } from 'ai'
import { ollama } from 'ollama-ai-provider'
import { z } from 'zod'

import { buildProgram } from '../tools/command'

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const messages: ModelMessage[] = []

async function main(model: Parameters<typeof ollama>[0]) {
  while (true) {
    const userInput = await terminal.question('You: ')

    messages.push({ content: userInput, role: 'user' })

    const result = await streamText({
      messages,
      model: ollama(model),
      stopWhen: stepCountIs(5),
      tools: {
        weather: tool({
          description: 'Get the weather in a location',
          execute: async ({ location }) => ({
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          }),
          inputSchema: z.object({
            location: z
              .string()
              .describe('The location to get the weather for'),
          }),
        }),
      },
    })

    process.stdout.write('\nAssistant: ')
    for await (const delta of result.textStream) {
      process.stdout.write(delta)
    }
    process.stdout.write('\n\n')

    // eslint-disable-next-line unicorn/no-await-expression-member
    messages.push(...(await result.response).messages)
  }
}

buildProgram('llama3.1', main).catch(console.error)
