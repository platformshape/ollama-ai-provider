#! /usr/bin/env -S pnpm tsx

import { generateText, tool } from 'ai'
import { ollama } from 'ollama-ai-provider'
import { z } from 'zod'

import { buildProgram } from '../tools/command'
import { weatherTool } from '../tools/weather-tool'

async function main(model: Parameters<typeof ollama>[0]) {
  const result = await generateText({
    maxOutputTokens: 512,
    model: ollama(model),
    prompt:
      'What is the weather in San Francisco and what attractions should I visit?',
    tools: {
      cityAttractions: tool({
        inputSchema: z.object({ city: z.string() }),
      }),
      weather: weatherTool,
    },
  })

  // typed tool calls:
  for (const toolCall of result.toolCalls) {
    switch (toolCall.toolName) {
      case 'cityAttractions': {
        toolCall.input.city // string
        break
      }

      case 'weather': {
        toolCall.input.location // string
        break
      }
    }
  }

  // typed tool results for tools with execute method:
  for (const toolResult of result.toolResults) {
    switch (toolResult.toolName) {
      // NOT AVAILABLE (NO EXECUTE METHOD)
      // case 'cityAttractions': {
      //   toolResult.args.city; // string
      //   toolResult.result;
      //   break;
      // }

      case 'weather': {
        toolResult.input.location // string
        toolResult.output.location // string
        toolResult.output.temperature // number
        break
      }
    }
  }

  console.log(JSON.stringify(result, null, 2))
}

buildProgram('llama3.1', main).catch(console.error)
