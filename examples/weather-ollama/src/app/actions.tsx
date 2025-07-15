'use server'

import { createAI } from '@ai-sdk/rsc'
import { generateId, ModelMessage } from 'ai'
import { ReactNode } from 'react'

import { submitUserMessage } from '@/lib/ai/actions'

export type Message = ModelMessage & {
  id: string
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  display: ReactNode
  id: string
}[]

export type UIActions = {
  submitUserMessage: typeof submitUserMessage
}

export const AI = createAI<AIState, UIState, UIActions>({
  actions: {
    submitUserMessage,
  },
  initialAIState: { chatId: generateId(), messages: [] },
  initialUIState: [],
})
