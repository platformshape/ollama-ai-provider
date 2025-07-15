#! /usr/bin/env -S pnpm tsx

import { generateText, stepCountIs, tool } from 'ai'
import { ollama } from 'ollama-ai-provider'
import { z } from 'zod'

import { buildProgram } from '../tools/command'
import { weatherTool } from '../tools/weather-tool'

async function main(model: Parameters<typeof ollama>[0]) {
  const { text } = await generateText({
    // disable all tools
    activeTools: [],
    model: ollama(model),
    prompt:
      'What is the weather in San Francisco and what attractions should I visit?',
    stopWhen: stepCountIs(5),
    tools: {
      cityAttractions: tool({
        inputSchema: z.object({ city: z.string() }),
      }),
      weather: weatherTool,
    },
  })

  console.log(text)
}

buildProgram('llama3.1', main).catch(console.error)
