import { LanguageModelV2StreamPart } from '@ai-sdk/provider'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InferToolCallsFromStream } from '@/generate-tool/infer-tool-calls-from-stream'

describe('InferToolCallsFromStream', () => {
  let controller: TransformStreamDefaultController<LanguageModelV2StreamPart>

  beforeEach(() => {
    controller = {
      desiredSize: 0,
      enqueue: vi.fn(),
      error: vi.fn(),
      terminate: vi.fn(),
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('should ignore no tooling %s mode types', () => {
    it('should return is not a call stream', () => {
      // Arrange
      const inferToolCallsFromStream = new InferToolCallsFromStream({
        tools: [
          {
            inputSchema: {},
            name: 'json',
            type: 'function',
          },
        ],
      })
      const delta = 'Hi!'

      // Act
      const isToolCallStream = inferToolCallsFromStream.parse({
        controller,
        delta,
      })

      // Assert
      expect(isToolCallStream).toBeFalsy()
      expect(inferToolCallsFromStream.detectedToolCall).toBeFalsy()
      expect(controller.enqueue).not.toBeCalled()
    })

    it('should return stop finish reason', () => {
      // Arrange
      const inferToolCallsFromStream = new InferToolCallsFromStream({
        tools: [
          {
            inputSchema: {},
            name: 'json',
            type: 'function',
          },
        ],
      })
      const delta = 'Hi!'

      // Act
      inferToolCallsFromStream.parse({
        controller,
        delta,
      })

      // Assert
      expect(inferToolCallsFromStream.finish({ controller })).toEqual('stop')
      expect(controller.enqueue).not.toBeCalled()
    })
  })

  describe('should parse object-tool mode calls', () => {
    it('should detect is a tool call stream', () => {
      // Arrange
      const inferToolCallsFromStream = new InferToolCallsFromStream({
        tools: [
          {
            inputSchema: {},
            name: 'json',
            type: 'function',
          },
        ],
      })
      const delta = '{'

      // Act
      const isToolCallStream = inferToolCallsFromStream.parse({
        controller,
        delta,
      })

      // Assert
      expect(isToolCallStream).toBeTruthy()
    })

    it('should wait until function name is present', () => {
      // Arrange
      const inferToolCallsFromStream = new InferToolCallsFromStream({
        tools: [
          {
            inputSchema: {},
            name: 'json',
            type: 'function',
          },
        ],
      })
      const delta = '{ "name":'

      // Act
      inferToolCallsFromStream.parse({
        controller,
        delta,
      })

      // Assert
      expect(controller.enqueue).not.toBeCalled()
    })

    it('should enqueue function name ', () => {
      // Arrange
      const inferToolCallsFromStream = new InferToolCallsFromStream({
        tools: [
          {
            inputSchema: {},
            name: 'json',
            type: 'function',
          },
        ],
      })
      const deltas = ['{ "name":', '"json"', ', "parameters": {']

      // Act
      deltas.map((delta: string) =>
        inferToolCallsFromStream.parse({
          controller,
          delta,
        }),
      )

      // Assert
      expect(controller.enqueue).toBeCalledWith({
        input: expect.any(String),
        toolCallId: expect.any(String),
        toolName: 'json',
        type: 'tool-call',
      })
    })

    it('should enqueue tool-call-deltas ', () => {
      // Arrange
      const inferToolCallsFromStream = new InferToolCallsFromStream({
        tools: [
          {
            inputSchema: {},
            name: 'json',
            type: 'function',
          },
        ],
      })
      const deltas = [
        '{"name":',
        '"json"',
        ',"parameters":{',
        '"foo":"bar"',
        '}',
        '}',
      ]

      // Act
      deltas.map((delta: string) =>
        inferToolCallsFromStream.parse({
          controller,
          delta,
        }),
      )

      // Assert
      expect(controller.enqueue).toBeCalledTimes(4)
    })

    it('should enqueue complete tool call at end ', () => {
      // Arrange
      const inferToolCallsFromStream = new InferToolCallsFromStream({
        tools: [
          {
            inputSchema: {},
            name: 'json',
            type: 'function',
          },
        ],
      })
      const deltas = [
        '{"name":',
        '"json"',
        ',"parameters":{',
        '"foo":"bar"',
        '}',
        '}',
      ]

      // Act
      deltas.map((delta: string) =>
        inferToolCallsFromStream.parse({
          controller,
          delta,
        }),
      )
      const finishReason = inferToolCallsFromStream.finish({ controller })

      // Assert
      expect(controller.enqueue).toBeCalledWith({
        input: JSON.stringify({ foo: 'bar' }),
        toolCallId: expect.any(String),
        toolName: 'json',
        type: 'tool-call',
      })
      expect(finishReason).toEqual('tool-calls')
    })
  })
})
