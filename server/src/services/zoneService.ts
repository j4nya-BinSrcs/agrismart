import mongoose from 'mongoose';
import Zone, { IZone, IZoneView } from '../models/Zone.js';
import Field from '../models/Field.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { validateObjectId } from './farmService.js';

export interface ZoneInput {
  name?: unknown;
  areaAcres?: unknown;
  irrigationMethod?: unknown;
  soilMoisture?: unknown;
  description?: unknown;
}

const toZoneView = (zone: InstanceType<typeof Zone>): IZoneView =>
  zone.toJSON() as unknown as IZoneView;

export const zoneService = {
  /**
   * Creates a new Zone under a Field and Farm owned by the authenticated user
   */
  async createZone(userId: string, farmId: string, fieldId: string, data: ZoneInput = {}): Promise<IZoneView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(fieldId, 'Field ID');

    // Verify parent field ownership and farm association
    const field = await Field.findOne({ _id: fieldId, farm: farmId, owner: userId });
    if (!field) {
      throw ApiError.notFound('Field not found.');
    }

    const { name, areaAcres, irrigationMethod, soilMoisture, description } = data;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw ApiError.badRequest('Zone name is required and cannot be empty.');
    }

    if (areaAcres === undefined || areaAcres === null || isNaN(Number(areaAcres)) || Number(areaAcres) < 0) {
      throw ApiError.badRequest('Zone area in acres is required and must be greater than or equal to 0.');
    }

    if (soilMoisture !== undefined && soilMoisture !== null && soilMoisture !== '') {
      const moisture = Number(soilMoisture);
      if (isNaN(moisture) || moisture < 0 || moisture > 100) {
        throw ApiError.badRequest('Soil moisture must be a number between 0 and 100.');
      }
    }

    const zoneData: IZone = {
      field: new mongoose.Types.ObjectId(fieldId),
      farm: new mongoose.Types.ObjectId(farmId),
      owner: new mongoose.Types.ObjectId(userId),
      name: name.trim(),
      areaAcres: Number(areaAcres),
      irrigationMethod: typeof irrigationMethod === 'string' ? irrigationMethod.trim() : '',
      description: typeof description === 'string' ? description.trim() : '',
      soilMoisture: soilMoisture !== undefined && soilMoisture !== null && soilMoisture !== '' ? Number(soilMoisture) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const zone = await Zone.create(zoneData);

    logger.info(`Zone created: ${zone.name} (ID: ${zone._id}) under Field ${fieldId} by User ${userId}`);
    return toZoneView(zone);
  },

  /**
   * Retrieves all zones for a specific field owned by the user
   */
  async getZonesByField(userId: string, farmId: string, fieldId: string): Promise<IZoneView[]> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(fieldId, 'Field ID');

    const field = await Field.findOne({ _id: fieldId, farm: farmId, owner: userId });
    if (!field) {
      throw ApiError.notFound('Field not found.');
    }

    const zones = await Zone.find({ field: fieldId, farm: farmId, owner: userId }).sort({ createdAt: 1 });
    return zones.map((z) => toZoneView(z));
  },

  /**
   * Retrieves a specific zone by ID ensuring ownership chain
   */
  async getZoneById(userId: string, farmId: string, fieldId: string, zoneId: string): Promise<IZoneView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(fieldId, 'Field ID');
    validateObjectId(zoneId, 'Zone ID');

    const zone = await Zone.findOne({ _id: zoneId, field: fieldId, farm: farmId, owner: userId });
    if (!zone) {
      throw ApiError.notFound('Zone not found.');
    }

    return toZoneView(zone);
  },

  /**
   * Updates a specific zone
   */
  async updateZone(userId: string, farmId: string, fieldId: string, zoneId: string, updateData: ZoneInput = {}): Promise<IZoneView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(fieldId, 'Field ID');
    validateObjectId(zoneId, 'Zone ID');

    const zone = await Zone.findOne({ _id: zoneId, field: fieldId, farm: farmId, owner: userId });
    if (!zone) {
      throw ApiError.notFound('Zone not found.');
    }

    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || !updateData.name.trim()) {
        throw ApiError.badRequest('Zone name cannot be empty.');
      }
      zone.name = updateData.name.trim();
    }

    if (updateData.areaAcres !== undefined) {
      const area = Number(updateData.areaAcres);
      if (isNaN(area) || area < 0) {
        throw ApiError.badRequest('Zone area in acres must be greater than or equal to 0.');
      }
      zone.areaAcres = area;
    }

    if (updateData.irrigationMethod !== undefined) {
      zone.irrigationMethod = typeof updateData.irrigationMethod === 'string' ? updateData.irrigationMethod.trim() : '';
    }

    if (updateData.description !== undefined) {
      zone.description = typeof updateData.description === 'string' ? updateData.description.trim() : '';
    }

    if (updateData.soilMoisture !== undefined) {
      if (updateData.soilMoisture === null || updateData.soilMoisture === '') {
        zone.soilMoisture = null;
      } else {
        const moisture = Number(updateData.soilMoisture);
        if (isNaN(moisture) || moisture < 0 || moisture > 100) {
          throw ApiError.badRequest('Soil moisture must be a number between 0 and 100.');
        }
        zone.soilMoisture = moisture;
      }
    }

    await zone.save();
    logger.info(`Zone updated: ${zone._id} by User ${userId}`);
    return toZoneView(zone);
  },

  /**
   * Deletes a zone
   */
  async deleteZone(userId: string, farmId: string, fieldId: string, zoneId: string) {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(fieldId, 'Field ID');
    validateObjectId(zoneId, 'Zone ID');

    const zone = await Zone.findOne({ _id: zoneId, field: fieldId, farm: farmId, owner: userId });
    if (!zone) {
      throw ApiError.notFound('Zone not found.');
    }

    await Zone.deleteOne({ _id: zoneId, field: fieldId, farm: farmId, owner: userId });
    logger.info(`Zone deleted: ${zoneId} under Field ${fieldId} by User ${userId}`);

    return {
      deletedZoneId: zoneId,
    };
  },
};

export default zoneService;