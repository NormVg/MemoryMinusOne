import { ollama } from "ai-sdk-ollama"
import { generateText } from "ai"
import type { Judge, JudgeConfig, JudgeInput, JudgeResult } from "../types/judge"
import type { ProviderPrompts } from "../types/prompts"
import { buildJudgePrompt, parseJudgeResponse, getJudgePrompt } from "./base"
import { logger } from "../utils/logger"
import { getModelConfig, ModelConfig } from "../utils/models"

export class OllamaJudge implements Judge {
  name = "ollama"
  private modelConfig: ModelConfig | null = null
  private modelName: string = "phi4-mini"

  async initialize(config: JudgeConfig): Promise<void> {
    const modelAlias = config.model || "phi4-mini"
    this.modelName = modelAlias
    this.modelConfig = getModelConfig(modelAlias)
    logger.info(
      `Initialized Ollama judge with model: ${this.modelConfig.displayName} (${this.modelConfig.id})`
    )
  }

  async evaluate(input: JudgeInput): Promise<JudgeResult> {
    if (!this.modelConfig) throw new Error("Judge not initialized")

    const prompt = buildJudgePrompt(input)
    const model = ollama(this.modelName)

    const params: Record<string, unknown> = {
      model,
      prompt,
    }

    if (this.modelConfig.supportsTemperature) {
      params.temperature = this.modelConfig.defaultTemperature
    }

    params.maxTokens = this.modelConfig.defaultMaxTokens

    const { text } = await generateText(params as Parameters<typeof generateText>[0])

    return parseJudgeResponse(text)
  }

  getPromptForQuestionType(questionType: string, providerPrompts?: ProviderPrompts): string {
    return getJudgePrompt(questionType, providerPrompts)
  }

  getModel() {
    if (!this.modelConfig) throw new Error("Judge not initialized")
    return ollama(this.modelName)
  }
}

export default OllamaJudge
