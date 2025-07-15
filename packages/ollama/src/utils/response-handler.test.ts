import {
  convertArrayToReadableStream,
  convertReadableStreamToArray,
} from '@ai-sdk/provider-utils/test'
import { z } from 'zod'

import { createJsonStreamResponseHandler } from './response-handler'

describe('createJsonStreamResponseHandler', () => {
  it('should return a stream of complete json chunks', async () => {
    const handler = createJsonStreamResponseHandler(z.object({ a: z.number() }))

    const { value: stream } = await handler({
      requestBodyValues: {},
      response: new Response(
        convertArrayToReadableStream([
          JSON.stringify({ a: 1 }) + '\n',
          JSON.stringify({ a: 2 }) + '\n',
        ]).pipeThrough(new TextEncoderStream()),
      ),
      url: 'some url',
    })

    const streamArray = await Promise.all(
      await convertReadableStreamToArray(stream),
    )
    expect(streamArray).toStrictEqual([
      { rawValue: { a: 1 }, success: true, value: { a: 1 } },
      { rawValue: { a: 2 }, success: true, value: { a: 2 } },
    ])
  })

  it('should return a stream of partial json chunks', async () => {
    const handler = createJsonStreamResponseHandler(z.object({ a: z.number() }))

    const { value: stream } = await handler({
      requestBodyValues: {},
      response: new Response(
        convertArrayToReadableStream([
          '{ "a":', // start
          '1 }\n', // end
        ]).pipeThrough(new TextEncoderStream()),
      ),
      url: 'some url',
    })

    const streamArray = await Promise.all(
      await convertReadableStreamToArray(stream),
    )
    expect(streamArray).toStrictEqual([
      { rawValue: { a: 1 }, success: true, value: { a: 1 } },
    ])
  })

  it('should return a stream of multiple json chunks', async () => {
    const handler = createJsonStreamResponseHandler(z.object({ a: z.number() }))

    const { value: stream } = await handler({
      requestBodyValues: {},
      response: new Response(
        convertArrayToReadableStream([
          JSON.stringify({ a: 1 }) + '\n' + JSON.stringify({ a: 2 }) + '\n',
          '{ "a":', // start
          '3 }\n', // end
          JSON.stringify({ a: 4 }) + '\n',
        ]).pipeThrough(new TextEncoderStream()),
      ),
      url: 'some url',
    })

    const streamArray = await Promise.all(
      await convertReadableStreamToArray(stream),
    )
    expect(streamArray).toStrictEqual([
      { rawValue: { a: 1 }, success: true, value: { a: 1 } },
      { rawValue: { a: 2 }, success: true, value: { a: 2 } },
      { rawValue: { a: 3 }, success: true, value: { a: 3 } },
      { rawValue: { a: 4 }, success: true, value: { a: 4 } },
    ])
  })
})
