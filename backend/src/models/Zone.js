import mongoose from 'mongoose';

const ZoneSchema = new mongoose.Schema(
  {
    field: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Field',
      required: [true, 'Field reference is required'],
      index: true,
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
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
      transform(_doc, ret) {
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
      transform(_doc, ret) {
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

export const Zone = mongoose.model('Zone', ZoneSchema);

export default Zone;
