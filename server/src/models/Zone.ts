import { Model, Schema, Types, model } from 'mongoose';

export interface IZone {
  field: Types.ObjectId;
  farm: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  areaAcres: number;
  irrigationMethod: string;
  soilMoisture: number | null;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IZoneView {
  id: string;
  field: string;
  farm: string;
  owner: string;
  name: string;
  areaAcres: number;
  irrigationMethod: string;
  soilMoisture: number | null;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const ZoneSchema = new Schema<IZone>(
  {
    field: {
      type: Schema.Types.ObjectId,
      ref: 'Field',
      required: [true, 'Field reference is required'],
      index: true,
    },
    farm: {
      type: Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Zone owner is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Zone name is required'],
      trim: true,
    },
    areaAcres: {
      type: Number,
      required: [true, 'Zone area in acres is required'],
      min: [0, 'Zone area in acres must be greater than or equal to 0'],
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
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        if (ret.field && ret.field.toString) ret.field = ret.field.toString();
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
        if (ret.field && ret.field.toString) ret.field = ret.field.toString();
        if (ret.farm && ret.farm.toString) ret.farm = ret.farm.toString();
        if (ret.owner && ret.owner.toString) ret.owner = ret.owner.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ZoneSchema.index({ field: 1, farm: 1, owner: 1, createdAt: -1 });

export const Zone: Model<IZone> = model<IZone>('Zone', ZoneSchema);

export default Zone;