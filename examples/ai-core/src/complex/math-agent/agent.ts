#! /usr/bin/env -S pnpm tsx

import { generateText, stepCountIs, tool } from 'ai'
import * as mathjs from 'mathjs'
import { ollama } from 'ollama-ai-provider'
import { OllamaChatModelId } from 'ollama-ai-provider/src/ollama-chat-settings'
import { z } from 'zod/v4'

import { buildProgram } from '../../tools/command'

async function main(model: OllamaChatModelId) {
  const { text: answer } = await generateText({
    model: ollama(model),
    onStepFinish: async ({ toolResults }) => {
      console.log(`STEP RESULTS: ${JSON.stringify(toolResults, null, 2)}`)
    },
    prompt:
      'A taxi driver earns $9461 per 1-hour work. ' +
      'If he works 12 hours a day and in 1 hour he uses 14-liters petrol with price $134 for 1-liter. ' +
      'How much money does he earn in one day?',
    stopWhen: stepCountIs(10),
    system:
      'You are solving math problems. ' +
      'Reason step by step. ' +
      'Use the calculator when necessary. ' +
      'The calculator can only do simple additions, subtractions, multiplications, and divisions. ' +
      'When you give the final answer, provide an explanation for how you got it.',
    tools: {
      calculate: tool({
        description:
          'A tool for evaluating mathematical expressions. Example expressions: ' +
          "'1.2 * (2 + 4.5)', '12.7 cm to inch', 'sin(45 deg) ^ 2'.",
        execute: async ({ expression }) => mathjs.evaluate(expression),
        inputSchema: z.object({ expression: z.string() }),
      }),
    },
  })

  console.log(`FINAL ANSWER: ${answer}`)
}

buildProgram('qwen2.5', main).catch(console.error)
