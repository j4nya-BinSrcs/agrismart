import { AssistantMessage, AssistantContext, Language } from '../types';
import { apiRequest } from './apiClient';

interface AssistantBackendResponse {
  reply: string;
  language: Language;
  contextTag?: string;
  actionSuggestions?: string[];
  model?: string;
  contextGrounded?: boolean;
  timestamp?: string;
}

export const assistantService = {
  /**
   * Sends a farmer query to the grounded Gemini backend assistant.
   * Leverages real verified context (diagnosis, weather, irrigation plan).
   */
  async sendQuery(
    queryText: string,
    language: Language = 'en',
    context?: AssistantContext
  ): Promise<AssistantMessage> {
    const payload = {
      message: queryText,
      language,
      context: context
        ? {
            farmName: context.farmName,
            crop: context.crop,
            growthStage: context.growthStage,
            soilMoisture: context.soilMoisture,
            diagnosis: context.activeDiagnosis
              ? {
                  isMlPrediction: context.activeDiagnosis.isMlPrediction,
                  diseaseName: context.activeDiagnosis.diseaseName,
                  confidence: context.activeDiagnosis.confidence,
                  severity: context.activeDiagnosis.severity,
                  treatments: context.activeDiagnosis.treatmentProtocols
                    ? [
                        `Organic: ${context.activeDiagnosis.treatmentProtocols.organic}`,
                        `Conventional: ${context.activeDiagnosis.treatmentProtocols.conventional}`,
                        `Dosage: ${context.activeDiagnosis.treatmentProtocols.dosage}`,
                      ]
                    : undefined,
                }
              : undefined,
            weather: context.weather
              ? {
                  condition: context.weather.condition,
                  temperature: context.weather.temperature,
                  humidity: context.weather.humidity,
                  precipitationProbability: context.weather.rainProbability,
                  precipitationMm: context.weather.rainfallExpectedMm ?? context.weather.precipitationMm ?? 0,
                  windSpeed: context.weather.windSpeedKmH,
                }
              : undefined,
            irrigation: context.irrigation
              ? {
                  overallDecision: context.irrigation.overallRecommendation,
                  overallReason: context.irrigation.decisionReason,
                  totalGrossVolumeLitres: context.irrigation.totalRecommendedIrrigationLitres,
                  totalEstimatedAvoidedIrrigationLitres: context.irrigation.totalEstimatedAvoidedIrrigationLitres,
                }
              : undefined,
          }
        : undefined,
    };

    const result = await apiRequest<AssistantBackendResponse>('/assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: `bot-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: result.reply,
      contextTag: result.contextTag,
      actionSuggestions: result.actionSuggestions,
      language: result.language || language,
    };
  },
};

export default assistantService;
