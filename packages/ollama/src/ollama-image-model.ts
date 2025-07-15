import { ImageModelV2, UnsupportedFunctionalityError } from '@ai-sdk/provider'
import {
  createJsonResponseHandler,
  postJsonToApi,
} from '@ai-sdk/provider-utils'
import { z } from 'zod'

import { ollamaFailedResponseHandler } from '@/ollama-error'
import {
  OllamaImageModelId,
  OllamaImageSettings,
} from '@/ollama-image-settings'

type OllamaEmbeddingConfig = {
  baseURL: string
  fetch?: typeof fetch
  headers: () => Record<string, string | undefined>
  provider: string
}
export class OllamaImageModel implements ImageModelV2 {
  readonly specificationVersion = 'v2'
  readonly modelId: OllamaImageModelId

  private readonly config: OllamaEmbeddingConfig
  private readonly settings: OllamaImageSettings

  get provider(): string {
    return this.config.provider
  }

  get maxImagesPerCall(): number {
    return this.settings.maxImagesPerCall ?? 2048
  }

  get supportsParallelCalls(): boolean {
    return false
  }

  constructor(
    modelId: OllamaImageModelId,
    settings: OllamaImageSettings,
    config: OllamaEmbeddingConfig,
  ) {
    this.modelId = modelId
    this.settings = settings
    this.config = config
  }

  async doGenerate({
    abortSignal,
    prompt,
  }: Parameters<ImageModelV2['doGenerate']>[0]): Promise<
    Awaited<ReturnType<ImageModelV2['doGenerate']>>
  > {
    if (prompt.length > this.maxImagesPerCall) {
      throw new UnsupportedFunctionalityError({
        functionality: 'image generation',
        message: `Ollama image model ${this.modelId} does not support more than ${this.maxImagesPerCall} images per call.`,
      })
    }

    const { responseHeaders, value: response } = await postJsonToApi({
      abortSignal,
      body: {
        images,
        model: this.modelId,
      },
      failedResponseHandler: ollamaFailedResponseHandler,
      fetch: this.config.fetch,
      headers: this.config.headers(),
      successfulResponseHandler: createJsonResponseHandler(
        ollamaTextEmbeddingResponseSchema,
      ),
      url: `${this.config.baseURL}/embed`,
    })

    return {
      embeddings: response.embeddings,
      rawResponse: { headers: responseHeaders },
      usage: response.prompt_eval_count
        ? { tokens: response.prompt_eval_count }
        : undefined,
    }
  }
}

const ollamaTextEmbeddingResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())),
  prompt_eval_count: z.number().nullable(),
})
