import { LanguageModelV2CallOptions } from '@ai-sdk/provider'

export function addToLastUserMessage({
  params,
  text,
}: {
  params: LanguageModelV2CallOptions
  text: string
}): LanguageModelV2CallOptions {
  const { prompt, ...rest } = params

  const lastMessage = prompt.at(-1)

  if (lastMessage?.role !== 'user') {
    return params
  }

  return {
    ...rest,
    prompt: [
      ...prompt.slice(0, -1),
      {
        ...lastMessage,
        content: [{ text, type: 'text' }, ...lastMessage.content],
      },
    ],
  }
}
