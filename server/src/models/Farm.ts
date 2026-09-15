import { Model, Schema, Types, model } from 'mongoose';

export interface FarmLocation {
  latitude?: number;
  longitude?: number;
  address: string;
}

export interface FarmMember {
  user: Types.ObjectId;
  role: 'owner' | 'farmer' | 'manager' | 'agronomist';
  addedAt: Date;
}

export interface FarmMemberView {
  user: string;
  role: 'owner' | 'farmer' | 'manager' | 'agronomist';
  addedAt: Date;
}

export interface IFarm {
  name: string;
  location: FarmLocation;
  state?: string;
  district?: string;
  totalAreaAcres: number;
  description: string;
  members: FarmMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IFarmView {
  id: string;
  name: string;
  location: FarmLocation;
  state?: string;
  district?: string;
  totalAreaAcres: number;
  description: string;
  owner: string;
  members: FarmMemberView[];
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

const MemberSchema = new Schema<FarmMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'farmer', 'manager', 'agronomist'],
      default: 'farmer',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const FarmSchema = new Schema<IFarm>(
  {
    name: {
      type: String,
      required: [true, 'Farm name is required'],
      trim: true,
    },
    location: {
      type: LocationSchema,
      default: () => ({}),
    },
    state: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
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
    members: {
      type: [MemberSchema],
      default: [],
      validate: {
        validator: function(members: FarmMember[]) {
          const owners = members.filter(m => m.role === 'owner');
          return owners.length >= 1;
        },
        message: 'A farm must have at least one owner',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        // Convenience field: the owner is the member with role 'owner'
        if (ret.members && Array.isArray(ret.members)) {
          const ownerMember = ret.members.find(m => m.role === 'owner');
          if (ownerMember) ret.owner = ownerMember.user.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        if (ret.members && Array.isArray(ret.members)) {
          const ownerMember = ret.members.find(m => m.role === 'owner');
          if (ownerMember) ret.owner = ownerMember.user.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

FarmSchema.index({ 'members.user': 1, createdAt: -1 });

export const Farm: Model<IFarm> = model<IFarm>('Farm', FarmSchema);

export default Farm;