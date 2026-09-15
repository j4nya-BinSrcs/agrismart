import mongoose, { Model, Schema, Types, model } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

export type DiagnosisSource = 'expert_rules' | 'ml_unavailable' | 'ml';
export type DiagnosisSeverity = 'none' | 'low' | 'moderate' | 'high' | 'severe';

export interface RecommendedActionStep {
  step: number;
  title: string;
  description: string;
  timing: string;
}

export interface TreatmentProtocols {
  organic: string;
  conventional: string;
  dosage: string;
  applicationTiming: string;
}

export interface RelatedInsights {
  weatherRisk: string;
  irrigationAdvice: string;
  sustainabilityImpact: string;
}

export interface IDiagnosis {
  id: string;
  user?: Types.ObjectId | string;
  farm?: Types.ObjectId | string;
  field?: Types.ObjectId | string;
  crop: string;
  variety: string;
  growthStage: string;
  diseaseName: string;
  pathogenName: string;
  isHealthy: boolean;
  confidence: number;
  severity: DiagnosisSeverity;
  detectedAt: string;
  imageUrl: string;
  fieldLocation: string;
  shortExplanation: string;
  symptomsMatched: string[];
  symptomsRuledOut: string[];
  treatmentProtocols: TreatmentProtocols;
  precautions: string[];
  recommendedActions: RecommendedActionStep[];
  relatedInsights: RelatedInsights;
  source: DiagnosisSource;
  isMlPrediction: boolean;
  rawModelOutput: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type DiagnosisDocument = HydratedDocument<IDiagnosis>;

const RecommendedActionStepSchema = new Schema<RecommendedActionStep>(
  {
    step: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    timing: { type: String, required: true },
  },
  { _id: false }
);

const TreatmentProtocolsSchema = new Schema<TreatmentProtocols>(
  {
    organic: { type: String, default: '' },
    conventional: { type: String, default: '' },
    dosage: { type: String, default: '' },
    applicationTiming: { type: String, default: '' },
  },
  { _id: false }
);

const RelatedInsightsSchema = new Schema<RelatedInsights>(
  {
    weatherRisk: { type: String, default: '' },
    irrigationAdvice: { type: String, default: '' },
    sustainabilityImpact: { type: String, default: '' },
  },
  { _id: false }
);

const DiagnosisSchema = new Schema<IDiagnosis>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    farm: {
      type: Schema.Types.ObjectId,
      ref: 'Farm',
      index: true,
    },
    field: {
      type: Schema.Types.ObjectId,
      ref: 'Field',
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
      enum: ['none', 'low', 'moderate', 'high', 'severe'],
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
    // Provenance flags. Automated image classification is not performed in
    // this build; new records always use source="expert_rules" and
    // isMlPrediction=false. Legacy "ml_unavailable" records remain readable.
    source: {
      type: String,
      enum: ['expert_rules', 'ml_unavailable', 'ml'],
      default: 'expert_rules',
    },
    isMlPrediction: {
      type: Boolean,
      default: false,
    },
    rawModelOutput: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

DiagnosisSchema.index({ user: 1, createdAt: -1 });

export const Diagnosis: Model<IDiagnosis> =
  (mongoose.models.Diagnosis as Model<IDiagnosis> | undefined) ??
  model<IDiagnosis>('Diagnosis', DiagnosisSchema);

export default Diagnosis;