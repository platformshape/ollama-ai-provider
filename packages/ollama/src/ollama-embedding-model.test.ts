import { EmbeddingModelV2Embedding } from '@ai-sdk/provider'
import { createTestServer } from '@ai-sdk/provider-utils/test'

import { createOllama } from './ollama-provider'

const dummyEmbeddings = [
  [0.1, 0.2, 0.3, 0.4, 0.5],
  [0.6, 0.7, 0.8, 0.9, 1],
]
const testValues = ['sunny day at the beach', 'rainy day in the city']

const provider = createOllama({})
const model = provider.embedding('all-minilm')

describe('doEmbed', () => {
  const server: ReturnType<typeof createTestServer> = createTestServer({
    'http://127.0.0.1:11434/api/embed': {
      response: {
        body: {
          embeddings: dummyEmbeddings,
          model: 'all-minilm',
          prompt_eval_count: 8,
        },
        headers: {},
        type: 'json-value',
      },
    },
  })

  function prepareJsonResponse({
    embeddings = dummyEmbeddings,
    prompt_eval_count = 8,
    responseHeaders = {},
  }: {
    embeddings?: EmbeddingModelV2Embedding[]
    prompt_eval_count?: number
    responseHeaders?: Record<string, string>
  } = {}) {
    server.urls['http://127.0.0.1:11434/api/embed'].response = {
      body: {
        embeddings,
        model: 'all-minilm',
        prompt_eval_count,
      },
      headers: responseHeaders,
      type: 'json-value',
    }
  }

  it('should extract embedding', async () => {
    const { embeddings } = await model.doEmbed({ values: testValues })

    expect(embeddings).toStrictEqual(dummyEmbeddings)
  })

  it('should expose the raw response headers', async () => {
    prepareJsonResponse({
      responseHeaders: {
        'test-header': 'test-value',
      },
    })

    const rr = await model.doEmbed({
      values: testValues,
    })

    expect(rr?.response?.headers).toStrictEqual({
      'content-length': '101',
      // default headers:
      'content-type': 'application/json',

      // custom header
      'test-header': 'test-value',
    })
  })

  it('should pass the model and the values', async () => {
    await model.doEmbed({ values: testValues })

    expect(await server.calls.at(0)?.requestBodyJson).toStrictEqual({
      input: testValues,
      model: 'all-minilm',
    })
  })

  it('should pass custom headers', async () => {
    const ollamaProvider = createOllama({
      headers: {
        'Custom-Header': 'test-header',
      },
    })

    await ollamaProvider.embedding('all-minilm').doEmbed({
      values: testValues,
    })

    const requestHeaders = await server.calls.at(0)?.requestHeaders

    expect(requestHeaders).toStrictEqual({
      'content-type': 'application/json',
      'custom-header': 'test-header',
    })
  })
})
