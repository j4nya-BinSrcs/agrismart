import { Model, Schema, Types, model } from 'mongoose';

export interface FarmLocation {
  latitude?: number;
  longitude?: number;
  address: string;
}

export interface IFarm {
  owner: Types.ObjectId;
  name: string;
  location: FarmLocation;
  totalAreaAcres: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFarmView {
  id: string;
  owner: string;
  name: string;
  location: FarmLocation;
  totalAreaAcres: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<FarmLocation>(
  {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const FarmSchema = new Schema<IFarm>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farm owner is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Farm name is required'],
      trim: true,
    },
    location: {
      type: LocationSchema,
      default: () => ({}),
    },
    totalAreaAcres: {
      type: Number,
      required: [true, 'Total area in acres is required'],
      min: [0, 'Total area in acres must be greater than or equal to 0'],
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
        if (ret.owner && ret.owner.toString) {
          ret.owner = ret.owner.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        if (ret.owner && ret.owner.toString) {
          ret.owner = ret.owner.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

FarmSchema.index({ owner: 1, createdAt: -1 });

export const Farm: Model<IFarm> = model<IFarm>('Farm', FarmSchema);

export default Farm;