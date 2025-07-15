#! /usr/bin/env -S pnpm tsx

import { LanguageModelV2Middleware } from '@ai-sdk/provider'
import { generateText, wrapLanguageModel } from 'ai'
import { ollama } from 'ollama-ai-provider'

import { buildProgram } from '../tools/command'

const logProviderMetadataMiddleware: LanguageModelV2Middleware = {
  transformParams: async ({ params }) => {
    console.log(
      'providerMetadata: ' + JSON.stringify(params.providerOptions, null, 2),
    )
    return params
  },
}

async function main(model: Parameters<typeof ollama>[0]) {
  const { text } = await generateText({
    model: wrapLanguageModel({
      middleware: logProviderMetadataMiddleware,
      model: ollama(model),
    }),
    prompt: 'Invent a new holiday and describe its traditions.',
    providerOptions: {
      myMiddleware: {
        example: 'value',
      },
    },
  })

  console.log(text)
}

buildProgram('llama3.1', main).catch(console.error)
