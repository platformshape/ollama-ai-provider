#! /usr/bin/env -S pnpm tsx

import { streamText } from 'ai'
import { ollama } from 'ollama-ai-provider'
import { z } from 'zod/v4'

import { buildProgram } from '../tools/command'
import { weatherTool } from '../tools/weather-tool'

async function main(model: Parameters<typeof ollama>[0]) {
  const result = await streamText({
    model: ollama(model),
    prompt: 'What is the weather in San Francisco?',
    tools: {
      cityAttractions: {
        description: 'A tool to get top attractions in a city.',
        execute: async ({ city }) => {
          // Simulate fetching city attractions
          return `Top attractions in ${city}: Golden Gate Bridge, Alcatraz Island, Fisherman's Wharf.`
        },
        inputSchema: z.object({ city: z.string() }),
      },
      weather: weatherTool,
    },
  })

  for await (const part of result.fullStream) {
    switch (part.type) {
      case 'text': {
        console.log('Text delta:', part.text)
        break
      }

      case 'tool-call': {
        switch (part.toolName) {
          case 'cityAttractions': {
            console.log('TOOL CALL cityAttractions')
            console.log(`city: ${part.input.city}`) // string
            break
          }

          case 'weather': {
            console.log('TOOL CALL weather')
            console.log(`location: ${part.input.location}`) // string
            break
          }
        }

        break
      }

      case 'tool-result': {
        switch (part.toolName) {
          // NOT AVAILABLE (NO EXECUTE METHOD)
          // case 'cityAttractions': {
          //   console.log('TOOL RESULT cityAttractions');
          //   console.log(`city: ${part.args.city}`); // string
          //   console.log(`result: ${part.result}`);
          //   break;
          // }

          case 'weather': {
            console.log('TOOL RESULT weather')
            console.log(`location: ${part.input.location}`) // string
            console.log(`temperature: ${part.output.temperature}`) // number
            break
          }
        }

        break
      }

      case 'finish': {
        console.log('Finish reason:', part.finishReason)
        console.log('Usage:', part.totalUsage)
        break
      }

      case 'error': {
        console.error('Error:', part.error)
        break
      }
    }
  }
}

buildProgram('llama3.1', main).catch(console.error)
