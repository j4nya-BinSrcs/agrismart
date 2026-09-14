import mongoose from 'mongoose';
import Field, { IField, IFieldView, SupportedCrop } from '../models/Field.js';
import Farm from '../models/Farm.js';
import Zone from '../models/Zone.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { validateObjectId } from './farmService.js';

export interface FieldInput {
  name?: unknown;
  areaAcres?: unknown;
  crop?: unknown;
  variety?: unknown;
  growthStage?: unknown;
  soilType?: unknown;
  irrigationMethod?: unknown;
  soilMoisture?: unknown;
}

const toFieldView = (field: InstanceType<typeof Field>): IFieldView =>
  field.toJSON() as unknown as IFieldView;

export const fieldService = {
  /**
   * Creates a new Field under a Farm owned by the authenticated user
   */
  async createField(userId: string, farmId: string, data: FieldInput = {}): Promise<IFieldView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');

    // Verify parent farm ownership - check if user is a member of the farm
    const farm = await Farm.findOne({ 
      _id: farmId, 
      'members.user': userId 
    });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    const { name, areaAcres, crop, variety, growthStage, soilType, irrigationMethod, soilMoisture } = data;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw ApiError.badRequest('Field name is required and cannot be empty.');
    }

    if (areaAcres === undefined || areaAcres === null || isNaN(Number(areaAcres)) || Number(areaAcres) < 0) {
      throw ApiError.badRequest('Field area in acres is required and must be greater than or equal to 0.');
    }

    if (!crop || typeof crop !== 'string' || !crop.trim()) {
      throw ApiError.badRequest('Crop type is required (pepper_bell, potato, tomato).');
    }

    const validCrops: SupportedCrop[] = ['pepper_bell', 'potato', 'tomato'];
    if (!validCrops.includes(crop as SupportedCrop)) {
      throw ApiError.badRequest('Invalid crop type. Supported crops: pepper_bell, potato, tomato');
    }

    if (soilMoisture !== undefined && soilMoisture !== null && soilMoisture !== '') {
      const moisture = Number(soilMoisture);
      if (isNaN(moisture) || moisture < 0 || moisture > 100) {
        throw ApiError.badRequest('Soil moisture must be a number between 0 and 100.');
      }
    }

    const fieldData: IField = {
      farm: new mongoose.Types.ObjectId(farmId),
      owner: new mongoose.Types.ObjectId(userId),
      name: name.trim(),
      areaAcres: Number(areaAcres),
      crop: crop as SupportedCrop,
      variety: typeof variety === 'string' ? variety.trim() : '',
      growthStage: typeof growthStage === 'string' ? growthStage.trim() : '',
      soilType: typeof soilType === 'string' ? soilType.trim() : '',
      irrigationMethod: typeof irrigationMethod === 'string' ? irrigationMethod.trim() : '',
      soilMoisture: soilMoisture !== undefined && soilMoisture !== null && soilMoisture !== '' ? Number(soilMoisture) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const field = await Field.create(fieldData);

    logger.info(`Field created: ${field.name} (ID: ${field._id}) under Farm ${farmId} by User ${userId}`);
    return toFieldView(field);
  },

  /**
   * Retrieves all fields for a specific farm where user is a member
   */
  async getFieldsByFarm(userId: string, farmId: string): Promise<IFieldView[]> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    const fields = await Field.find({ farm: farmId }).sort({ createdAt: 1 });
    return fields.map((f) => toFieldView(f));
  },

  /**
   * Retrieves a specific field by ID ensuring farm membership
   */
  async getFieldById(userId: string, farmId: string, fieldId: string): Promise<IFieldView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(fieldId, 'Field ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    const field = await Field.findOne({ _id: fieldId, farm: farmId });
    if (!field) {
      throw ApiError.notFound('Field not found.');
    }

    return toFieldView(field);
  },

  /**
   * Updates a specific field
   */
  async updateField(userId: string, farmId: string, fieldId: string, updateData: FieldInput = {}): Promise<IFieldView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(fieldId, 'Field ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    const field = await Field.findOne({ _id: fieldId, farm: farmId });
    if (!field) {
      throw ApiError.notFound('Field not found.');
    }

    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || !updateData.name.trim()) {
        throw ApiError.badRequest('Field name cannot be empty.');
      }
      field.name = updateData.name.trim();
    }

    if (updateData.areaAcres !== undefined) {
      const area = Number(updateData.areaAcres);
      if (isNaN(area) || area < 0) {
        throw ApiError.badRequest('Field area in acres must be greater than or equal to 0.');
      }
      field.areaAcres = area;
    }

    if (updateData.crop !== undefined) {
      const validCrops: SupportedCrop[] = ['pepper_bell', 'potato', 'tomato'];
      if (!validCrops.includes(updateData.crop as SupportedCrop)) {
        throw ApiError.badRequest('Invalid crop type. Supported crops: pepper_bell, potato, tomato');
      }
      field.crop = updateData.crop as SupportedCrop;
    }

    if (updateData.variety !== undefined) {
      field.variety = typeof updateData.variety === 'string' ? updateData.variety.trim() : '';
    }

    if (updateData.growthStage !== undefined) {
      field.growthStage = typeof updateData.growthStage === 'string' ? updateData.growthStage.trim() : '';
    }

    if (updateData.soilType !== undefined) {
      field.soilType = typeof updateData.soilType === 'string' ? updateData.soilType.trim() : '';
    }

    if (updateData.irrigationMethod !== undefined) {
      field.irrigationMethod = typeof updateData.irrigationMethod === 'string' ? updateData.irrigationMethod.trim() : '';
    }

    if (updateData.soilMoisture !== undefined) {
      if (updateData.soilMoisture === null || updateData.soilMoisture === '') {
        field.soilMoisture = null;
      } else {
        const moisture = Number(updateData.soilMoisture);
        if (isNaN(moisture) || moisture < 0 || moisture > 100) {
          throw ApiError.badRequest('Soil moisture must be a number between 0 and 100.');
        }
        field.soilMoisture = moisture;
      }
    }

    await field.save();
    logger.info(`Field updated: ${field._id} by User ${userId}`);
    return toFieldView(field);
  },

  /**
   * Deletes a field and cascades deletion to all its child zones
   */
  async deleteField(userId: string, farmId: string, fieldId: string) {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(fieldId, 'Field ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    const field = await Field.findOne({ _id: fieldId, farm: farmId });
    if (!field) {
      throw ApiError.notFound('Field not found.');
    }

    // Cascade deletion: Delete child Zones
    const zonesDeleteResult = await Zone.deleteMany({ field: fieldId });
    await Field.deleteOne({ _id: fieldId, farm: farmId });

    logger.info(
      `Field deleted: ${fieldId} under Farm ${farmId} by User ${userId} (Cascaded: ${zonesDeleteResult.deletedCount} zones removed)`
    );

    return {
      deletedFieldId: fieldId,
      cascadedZonesCount: zonesDeleteResult.deletedCount,
    };
  },
};

export default fieldService;