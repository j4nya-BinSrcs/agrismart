import mongoose from 'mongoose';

const RecommendedActionStepSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    timing: { type: String, required: true },
  },
  { _id: false }
);

const TreatmentProtocolsSchema = new mongoose.Schema(
  {
    organic: { type: String, default: '' },
    conventional: { type: String, default: '' },
    dosage: { type: String, default: '' },
    applicationTiming: { type: String, default: '' },
  },
  { _id: false }
);

const RelatedInsightsSchema = new mongoose.Schema(
  {
    weatherRisk: { type: String, default: '' },
    irrigationAdvice: { type: String, default: '' },
    sustainabilityImpact: { type: String, default: '' },
  },
  { _id: false }
);

const DiagnosisSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    crop: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    variety: {
      type: String,
      trim: true,
      default: '',
    },
    growthStage: {
      type: String,
      required: true,
      trim: true,
    },
    diseaseName: {
      type: String,
      required: true,
      trim: true,
    },
    pathogenName: {
      type: String,
      trim: true,
      default: '',
    },
    isHealthy: {
      type: Boolean,
      default: false,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    severity: {
      type: String,
      enum: ['low', 'moderate', 'high', 'severe'],
      default: 'low',
    },
    detectedAt: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    fieldLocation: {
      type: String,
      required: true,
      trim: true,
    },
    shortExplanation: {
      type: String,
      required: true,
    },
    symptomsMatched: {
      type: [String],
      default: [],
    },
    symptomsRuledOut: {
      type: [String],
      default: [],
    },
    treatmentProtocols: {
      type: TreatmentProtocolsSchema,
      default: () => ({}),
    },
    precautions: {
      type: [String],
      default: [],
    },
    recommendedActions: {
      type: [RecommendedActionStepSchema],
      default: [],
    },
    relatedInsights: {
      type: RelatedInsightsSchema,
      default: () => ({}),
    },
    // Explicit ML provenance flags
    source: {
      type: String,
      enum: ['ml_service', 'ml_unavailable', 'expert_rules'],
      default: 'ml_unavailable',
    },
    isMlPrediction: {
      type: Boolean,
      default: false,
    },
    rawModelOutput: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Diagnosis = mongoose.models.Diagnosis || mongoose.model('Diagnosis', DiagnosisSchema);

export default Diagnosis;
