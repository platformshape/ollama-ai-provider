import { LanguageModelV2Middleware } from '@ai-sdk/provider'

export const yourGuardrailMiddleware: LanguageModelV2Middleware = {
  wrapGenerate: async ({ doGenerate }) => {
    const { content, ...rest } = await doGenerate()

    // filtering approach, e.g. for PII or other sensitive information:
    const redactedContent = content?.map((c) =>
      c.type === 'text'
        ? { ...c, text: c.text.replaceAll('badword', '<REDACTED>') }
        : c,
    )

    return { content: redactedContent, ...rest }
  },

  // here you would implement the guardrail logic for streaming
  // Note: streaming guardrails are difficult to implement, because
  // you do not know the full content of the stream until it's finished.
}
