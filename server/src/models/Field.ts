import { Model, Schema, Types, model } from 'mongoose';

export type SupportedCrop =
  | 'pepper_bell'
  | 'potato'
  | 'tomato'
  | 'corn'
  | 'apple'
  | 'grape'
  | 'wheat';

export const SUPPORTED_CROPS: SupportedCrop[] = [
  'pepper_bell',
  'potato',
  'tomato',
  'corn',
  'apple',
  'grape',
  'wheat',
];

export const CROP_DISPLAY_NAMES: Record<SupportedCrop, string> = {
  pepper_bell: 'Pepper Bell',
  potato: 'Potato',
  tomato: 'Tomato',
  corn: 'Corn',
  apple: 'Apple',
  grape: 'Grape',
  wheat: 'Wheat',
};

export interface IField {
  farm: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  areaAcres: number;
  crop: string;
  variety: string;
  growthStage: string;
  soilType: string;
  irrigationMethod: string;
  soilMoisture: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFieldView {
  id: string;
  farm: string;
  owner: string;
  name: string;
  areaAcres: number;
  crop: string;
  variety: string;
  growthStage: string;
  soilType: string;
  irrigationMethod: string;
  soilMoisture: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const FieldSchema = new Schema<IField>(
  {
    farm: {
      type: Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Field owner is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Field name is required'],
      trim: true,
    },
    areaAcres: {
      type: Number,
      required: [true, 'Field area in acres is required'],
      min: [0, 'Field area in acres must be greater than or equal to 0'],
    },
    crop: {
      type: String,
      required: [true, 'Crop type is required'],
    },
    variety: {
      type: String,
      trim: true,
      default: '',
    },
    growthStage: {
      type: String,
      trim: true,
      default: '',
    },
    soilType: {
      type: String,
      trim: true,
      default: '',
    },
    irrigationMethod: {
      type: String,
      trim: true,
      default: '',
    },
    soilMoisture: {
      type: Number,
      min: [0, 'Soil moisture cannot be less than 0%'],
      max: [100, 'Soil moisture cannot exceed 100%'],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        if (ret.farm && ret.farm.toString) ret.farm = ret.farm.toString();
        if (ret.owner && ret.owner.toString) ret.owner = ret.owner.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        if (ret.farm && ret.farm.toString) ret.farm = ret.farm.toString();
        if (ret.owner && ret.owner.toString) ret.owner = ret.owner.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

FieldSchema.index({ farm: 1, owner: 1, createdAt: -1 });

export const Field: Model<IField> = model<IField>('Field', FieldSchema);

export default Field;