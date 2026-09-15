import { Model, Schema, model } from 'mongoose';

export type SupportedCrop =
  | 'pepper_bell'
  | 'potato'
  | 'tomato'
  | 'corn'
  | 'apple'
  | 'grape'
  | 'wheat';

export interface TreatmentProtocol {
  organic: string;
  conventional: string;
  dosage: string;
  applicationTiming: string;
}

export interface SymptomInfo {
  name: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
}

export interface DiseaseInfo {
  diseaseName: string;
  pathogenName: string;
  isHealthy: boolean;
  symptoms: SymptomInfo[];
  treatmentProtocols: TreatmentProtocol;
  precautions: string[];
  recommendedActions: {
    step: number;
    title: string;
    description: string;
    timing: string;
  }[];
  relatedInsights: {
    weatherRisk: string;
    irrigationAdvice: string;
    sustainabilityImpact: string;
  };
}

export interface ICropKnowledge {
  crop: SupportedCrop;
  diseases: DiseaseInfo[];
  createdAt: Date;
  updatedAt: Date;
}

const SymptomInfoSchema = new Schema<SymptomInfo>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'moderate', 'high', 'severe'],
      default: 'moderate',
    },
  },
  { _id: false }
);

const TreatmentProtocolSchema = new Schema<TreatmentProtocol>(
  {
    organic: { type: String, default: '' },
    conventional: { type: String, default: '' },
    dosage: { type: String, default: '' },
    applicationTiming: { type: String, default: '' },
  },
  { _id: false }
);

const RecommendedActionSchema = new Schema(
  {
    step: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    timing: { type: String, required: true },
  },
  { _id: false }
);

const RelatedInsightsSchema = new Schema(
  {
    weatherRisk: { type: String, default: '' },
    irrigationAdvice: { type: String, default: '' },
    sustainabilityImpact: { type: String, default: '' },
  },
  { _id: false }
);

const DiseaseInfoSchema = new Schema<DiseaseInfo>(
  {
    diseaseName: { type: String, required: true },
    pathogenName: { type: String, required: true },
    isHealthy: { type: Boolean, default: false },
    symptoms: [SymptomInfoSchema],
    treatmentProtocols: { type: TreatmentProtocolSchema, required: true },
    precautions: [{ type: String }],
    recommendedActions: [RecommendedActionSchema],
    relatedInsights: { type: RelatedInsightsSchema, required: true },
  },
  { _id: false }
);

const CropKnowledgeSchema = new Schema<ICropKnowledge>(
  {
    crop: {
      type: String,
      enum: ['pepper_bell', 'potato', 'tomato'],
      required: true,
      unique: true,
      index: true,
    },
    diseases: {
      type: [DiseaseInfoSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const CropKnowledge: Model<ICropKnowledge> = model<ICropKnowledge>('CropKnowledge', CropKnowledgeSchema);

export default CropKnowledge;