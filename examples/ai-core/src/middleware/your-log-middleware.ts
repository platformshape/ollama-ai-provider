import {
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider'

export const yourLogMiddleware: LanguageModelV2Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    console.log('doGenerate called')
    console.log(`params: ${JSON.stringify(params, null, 2)}`)

    const result = await doGenerate()

    console.log('doGenerate finished')
    console.log(`generated text: ${result.content}`)

    return result
  },

  wrapStream: async ({ doStream, params }) => {
    console.log('doStream called')
    console.log(`params: ${JSON.stringify(params, null, 2)}`)

    const { stream, ...rest } = await doStream()

    let generatedText = ''

    const transformStream = new TransformStream<
      LanguageModelV2StreamPart,
      LanguageModelV2StreamPart
    >({
      flush() {
        console.log('doStream finished')
        console.log(`generated text: ${generatedText}`)
      },

      transform(chunk, controller) {
        if (chunk.type === 'text-delta') {
          generatedText += chunk.delta
        }

        controller.enqueue(chunk)
      },
    })

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    }
  },
}
