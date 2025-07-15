import { LanguageModelV2Prompt } from '@ai-sdk/provider'
import {
  convertReadableStreamToArray,
  createTestServer,
} from '@ai-sdk/provider-utils/test'
import { describe, expect, it } from 'vitest'

import { createOllama } from '@/ollama-provider'

const TEST_PROMPT: LanguageModelV2Prompt = [
  { content: [{ text: 'Hello', type: 'text' }], role: 'user' },
]

const provider = createOllama()
const model = provider.chat('model')

type prepareJsonResponseProperties = {
  created_at?: string
  done?: boolean
  done_reason?: string
  eval_count?: number
  eval_duration?: number
  headers?: Record<string, string>
  id?: string
  load_duration?: number
  message?: {
    content: string
    role: string
    tool_calls?: Array<{
      function: { arguments: Record<string, unknown>; name: string }
      id?: string
    }>
  }
  modelName?: string
  prompt_eval_count?: number
  prompt_eval_duration?: number
  total_duration?: number
}

describe('doGenerate', () => {
  const server = createTestServer({
    'http://127.0.0.1:11434/api/chat': {},
  })

  function prepareJsonResponse({
    created_at = new Date(1_711_115_037).toISOString(),
    done = true,
    done_reason = 'stop',
    eval_count = 8,
    eval_duration = 333,
    headers = {},
    load_duration = 1000,
    message = { content: 'hi', role: 'assistant' },
    modelName = 'test-model',
    prompt_eval_count = 4,
    prompt_eval_duration = 11,
    total_duration = 1000,
  }: prepareJsonResponseProperties = {}) {
    server.urls['http://127.0.0.1:11434/api/chat'].response = {
      body: {
        created_at,
        done,
        done_reason,
        eval_count,
        eval_duration,
        load_duration,
        message,
        model: modelName,
        prompt_eval_count,
        prompt_eval_duration,
        total_duration,
      },
      headers,
      type: 'json-value',
    }
  }

  it('should extract text response', async () => {
    prepareJsonResponse({
      message: { content: 'Hello, World!', role: 'assistant', tool_calls: [] },
    })

    const { content } = await model.doGenerate({
      prompt: TEST_PROMPT,
    })

    expect(content).toStrictEqual([{ text: 'Hello, World!', type: 'text' }])
  })

  it('should extract usage', async () => {
    prepareJsonResponse({
      eval_count: 8,
      message: { content: '', role: 'assistant' },
      prompt_eval_count: 4,
    })

    const { usage } = await model.doGenerate({
      prompt: TEST_PROMPT,
    })

    expect(usage).toStrictEqual({
      inputTokens: 4,
      outputTokens: 8,
      totalTokens: 12,
    })
  })

  it('should extract finish reason', async () => {
    prepareJsonResponse({
      done_reason: 'stop',
    })

    const response = await model.doGenerate({
      prompt: TEST_PROMPT,
    })

    expect(response.finishReason).toStrictEqual('stop')
  })

  it('should support unknown finish reason', async () => {
    prepareJsonResponse({
      done_reason: 'eos',
    })

    const response = await model.doGenerate({
      prompt: TEST_PROMPT,
    })

    expect(response.finishReason).toStrictEqual('other')
  })

  it('should expose the raw response headers', async () => {
    prepareJsonResponse({
      headers: {
        'test-header': 'test-value',
      },
    })

    const { response } = await model.doGenerate({
      prompt: TEST_PROMPT,
    })

    expect(response?.headers).toStrictEqual({
      // default headers:
      'content-length': '267',
      'content-type': 'application/json',

      // custom header
      'test-header': 'test-value',
    })
  })

  it('should pass the model and the messages', async () => {
    prepareJsonResponse()

    await model.doGenerate({
      prompt: TEST_PROMPT,
    })

    expect(await server.calls.at(0)?.requestBodyJson).toStrictEqual({
      messages: [{ content: 'Hello', role: 'user' }],
      model: 'model',
      options: {},
      stream: false,
    })
  })

  it('should pass settings', async () => {
    prepareJsonResponse()

    await provider
      .chat('model', {
        numCtx: 1024,
      })
      .doGenerate({
        prompt: TEST_PROMPT,
      })

    expect(await server.calls.at(0)?.requestBodyJson).toStrictEqual({
      messages: [{ content: 'Hello', role: 'user' }],
      model: 'model',
      options: {
        num_ctx: 1024,
      },
      stream: false,
    })
  })

  it('should pass tools', async () => {
    prepareJsonResponse()

    await model.doGenerate({
      prompt: TEST_PROMPT,
      tools: [
        {
          description: 'Test tool',
          inputSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            additionalProperties: false,
            properties: { value: { type: 'string' } },
            required: ['value'],
            type: 'object',
          },
          name: 'test-tool',
          type: 'function',
        },
      ],
    })

    expect(await server.calls.at(0)?.requestBodyJson).toStrictEqual({
      messages: [{ content: 'Hello', role: 'user' }],
      model: 'model',
      options: {},
      stream: false,
      tools: [
        {
          function: {
            description: 'Test tool',
            name: 'test-tool',
            parameters: {
              $schema: 'http://json-schema.org/draft-07/schema#',
              additionalProperties: false,
              properties: { value: { type: 'string' } },
              required: ['value'],
              type: 'object',
            },
          },
          type: 'function',
        },
      ],
    })
  })

  it('should pass headers', async () => {
    prepareJsonResponse()

    const providerWithHeaders = createOllama({
      headers: {
        'Custom-Provider-Header': 'provider-header-value',
      },
    })

    await providerWithHeaders.chat('gpt-3.5-turbo').doGenerate({
      headers: {
        'Custom-Request-Header': 'request-header-value',
      },
      prompt: TEST_PROMPT,
    })

    const requestHeaders = await server.calls.at(0)?.requestHeaders

    expect(requestHeaders).toStrictEqual({
      'content-type': 'application/json',
      'custom-provider-header': 'provider-header-value',
      'custom-request-header': 'request-header-value',
    })
  })

  it('should parse tool results', async () => {
    prepareJsonResponse({
      message: {
        content: '',
        role: 'assistant',
        tool_calls: [
          {
            function: {
              arguments: { value: 'Spark' },
              name: 'test-tool',
            },
            id: 'call_O17Uplv4lJvD6DVdIvFFeRMw',
          },
        ],
      },
    })

    const result = await model.doGenerate({
      prompt: TEST_PROMPT,
      toolChoice: {
        toolName: 'test-tool',
        type: 'tool',
      },
      tools: [
        {
          description: 'Test tool',
          inputSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            additionalProperties: false,
            properties: { value: { type: 'string' } },
            required: ['value'],
            type: 'object',
          },
          name: 'test-tool',
          type: 'function',
        },
      ],
    })

    expect(result?.finishReason).toEqual('tool-calls')
    expect(result.content).toStrictEqual([
      {
        input: '{"value":"Spark"}',
        toolCallId: 'call_O17Uplv4lJvD6DVdIvFFeRMw',
        toolName: 'test-tool',
        type: 'tool-call',
      },
    ])
  })
})

describe('doStream', () => {
  const server = createTestServer({
    'http://127.0.0.1:11434/api/chat': {},
  })

  function prepareStreamResponse({
    content = [],
    finish_reason = 'stop',
    headers = {},
    model: aiModel = 'model',
    toolCalls = [],
    usage = {
      eval_count: 10,
      prompt_eval_count: 10,
    },
  }: {
    content: string[]
    finish_reason?: string
    headers?: Record<string, string>
    model?: string
    toolCalls?: Array<{
      function: { arguments: Record<string, unknown>; name: string }
      id?: string
    }>
    usage?: {
      eval_count: number
      prompt_eval_count: number
    }
  }) {
    const getChunk = (text: string) =>
      JSON.stringify({
        created_at: '2025-05-27T22:54:58.100309Z',
        done: false,
        message: {
          content: text,
          role: 'assistant',
        },
        model: aiModel,
      }) + '\n'

    const getToolCallChunk = (toolCall: Record<string, unknown>) =>
      JSON.stringify({
        created_at: '2025-05-27T22:54:58.100309Z',
        done: false,
        message: {
          content: '',
          role: 'assistant',
          tool_calls: [toolCall],
        },
        model: aiModel,
      }) + '\n'

    const finalChunk =
      JSON.stringify({
        created_at: '2025-05-27T22:54:58.100309Z',
        done: true,
        done_reason: finish_reason,
        eval_count: usage.eval_count,
        eval_duration: 0,
        id: 'test-id',
        load_duration: 0,
        message: { content: '', role: 'assistant' },
        model: aiModel,
        prompt_eval_count: usage.prompt_eval_count,
        prompt_eval_duration: 0,
        total_duration: 0,
      }) + '\n'

    server.urls['http://127.0.0.1:11434/api/chat'].response = {
      chunks: [
        ...content.map((element) => getChunk(element)),
        ...toolCalls.map((tc) => getToolCallChunk(tc)),
        finalChunk,
      ],
      headers,
      type: 'stream-chunks',
    }
  }

  it('should stream text deltas', async () => {
    prepareStreamResponse({
      content: ['Hello', ', ', 'World!'],
      usage: { eval_count: 290, prompt_eval_count: 26 },
    })

    const { stream } = await model.doStream({
      prompt: TEST_PROMPT,
    })

    expect(await convertReadableStreamToArray(stream)).toStrictEqual([
      { type: 'stream-start', warnings: [] },
      {
        id: undefined,
        modelId: 'model',
        timestamp: new Date('2025-05-27T22:54:58.100309Z'),
        type: 'response-metadata',
      },
      { id: '0', type: 'text-start' },
      { delta: 'Hello', id: '0', type: 'text-delta' },
      { delta: ', ', id: '0', type: 'text-delta' },
      { delta: 'World!', id: '0', type: 'text-delta' },
      { id: '0', type: 'text-end' },
      {
        finishReason: 'stop',
        type: 'finish',
        usage: { inputTokens: 26, outputTokens: 290, totalTokens: 316 },
      },
    ])
  })

  it('should stream tool deltas', async () => {
    // Arrange

    prepareStreamResponse({
      content: [],
      toolCalls: [
        {
          function: {
            arguments: { value: 'Spark' },
            name: 'test-tool',
          },
          id: 'call_O17Uplv4lJvD6DVdIvFFeRMw',
        },
      ],
    })

    // Act
    const { stream } = await model.doStream({
      prompt: TEST_PROMPT,
      tools: [
        {
          description: 'Test tool',
          inputSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            additionalProperties: false,
            properties: { value: { type: 'string' } },
            required: ['value'],
            type: 'object',
          },
          name: 'test-tool',
          type: 'function',
        },
      ],
    })

    // Assert
    expect(await convertReadableStreamToArray(stream)).toStrictEqual([
      { type: 'stream-start', warnings: [] },
      {
        id: undefined,
        modelId: 'model',
        timestamp: new Date('2025-05-27T22:54:58.100309Z'),
        type: 'response-metadata',
      },
      {
        id: 'call_O17Uplv4lJvD6DVdIvFFeRMw',
        toolName: 'test-tool',
        type: 'tool-input-start',
      },
      {
        delta: '{"value":"Spark"}',
        id: 'call_O17Uplv4lJvD6DVdIvFFeRMw',
        type: 'tool-input-delta',
      },
      {
        id: 'call_O17Uplv4lJvD6DVdIvFFeRMw',
        type: 'tool-input-end',
      },
      {
        input: '{"value":"Spark"}',
        toolCallId: 'call_O17Uplv4lJvD6DVdIvFFeRMw',
        toolName: 'test-tool',
        type: 'tool-call',
      },
      {
        finishReason: 'stop',
        type: 'finish',
        usage: {
          inputTokens: 10,
          outputTokens: 10,
          totalTokens: 20,
        },
      },
    ])
  })

  it('should expose the raw response headers', async () => {
    prepareStreamResponse({
      content: [],
      headers: {
        'test-header': 'test-value',
      },
    })

    const { response } = await model.doStream({
      prompt: TEST_PROMPT,
    })

    expect(response?.headers).toStrictEqual({
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      // default headers:
      'content-type': 'text/event-stream',

      // custom header
      'test-header': 'test-value',
    })
  })

  it('should pass the messages and the model', async () => {
    prepareStreamResponse({ content: [] })

    await model.doStream({
      prompt: TEST_PROMPT,
    })

    expect(await server.calls.at(0)?.requestBodyJson).toStrictEqual({
      messages: [{ content: 'Hello', role: 'user' }],
      model: 'model',
      options: {},
    })
  })

  it('should pass custom headers', async () => {
    prepareStreamResponse({ content: [] })

    const customProvider = createOllama({
      headers: {
        'Custom-Header': 'test-header',
      },
    })

    await customProvider.chat('gpt-3.5-turbo').doStream({
      prompt: TEST_PROMPT,
    })

    const requestHeaders = await server.calls.at(0)?.requestHeaders

    expect(requestHeaders).toStrictEqual({
      'content-type': 'application/json',
      'custom-header': 'test-header',
    })
  })
})
