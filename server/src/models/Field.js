import mongoose from 'mongoose';

const FieldSchema = new mongoose.Schema(
  {
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
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
      trim: true,
      default: '',
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
      transform(_doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
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

export const Field = mongoose.model('Field', FieldSchema);

export default Field;
