import mongoose from 'mongoose';
import Farm from '../models/Farm.js';
import Field from '../models/Field.js';
import Zone from '../models/Zone.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export const validateObjectId = (id, name = 'Resource ID') => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest(`Invalid ${name} format.`);
  }
};

const validateCoordinates = (location) => {
  if (!location) return;

  if (location.latitude !== undefined && location.latitude !== null) {
    const lat = Number(location.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw ApiError.badRequest('Latitude must be a valid number between -90 and 90.');
    }
  }

  if (location.longitude !== undefined && location.longitude !== null) {
    const lng = Number(location.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw ApiError.badRequest('Longitude must be a valid number between -180 and 180.');
    }
  }
};

export const farmService = {
  /**
   * Creates a new Farm owned by the authenticated user
   */
  async createFarm(userId, data = {}) {
    validateObjectId(userId, 'User ID');

    const { name, location, totalAreaAcres, description } = data;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw ApiError.badRequest('Farm name is required and cannot be empty.');
    }

    if (totalAreaAcres === undefined || totalAreaAcres === null || isNaN(Number(totalAreaAcres)) || Number(totalAreaAcres) < 0) {
      throw ApiError.badRequest('Total area in acres is required and must be greater than or equal to 0.');
    }

    validateCoordinates(location);

    const farmData = {
      owner: userId,
      name: name.trim(),
      totalAreaAcres: Number(totalAreaAcres),
      description: typeof description === 'string' ? description.trim() : '',
      location: {
        latitude: location?.latitude !== undefined && location.latitude !== null && location.latitude !== '' ? Number(location.latitude) : undefined,
        longitude: location?.longitude !== undefined && location.longitude !== null && location.longitude !== '' ? Number(location.longitude) : undefined,
        address: typeof location?.address === 'string' ? location.address.trim() : '',
      },
    };

    const farm = await Farm.create(farmData);
    logger.info(`Farm created: ${farm.name} (ID: ${farm._id}) by User ${userId}`);
    return farm.toJSON();
  },

  /**
   * Retrieves all farms owned by the user
   */
  async getFarmsByUser(userId) {
    validateObjectId(userId, 'User ID');
    const farms = await Farm.find({ owner: userId }).sort({ createdAt: -1 });
    return farms.map((f) => f.toJSON());
  },

  /**
   * Retrieves a specific farm owned by the user
   */
  async getFarmById(userId, farmId) {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');

    const farm = await Farm.findOne({ _id: farmId, owner: userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found.');
    }

    return farm.toJSON();
  },

  /**
   * Updates a farm owned by the user
   */
  async updateFarm(userId, farmId, updateData = {}) {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');

    const farm = await Farm.findOne({ _id: farmId, owner: userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found.');
    }

    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || !updateData.name.trim()) {
        throw ApiError.badRequest('Farm name cannot be empty.');
      }
      farm.name = updateData.name.trim();
    }

    if (updateData.totalAreaAcres !== undefined) {
      const area = Number(updateData.totalAreaAcres);
      if (isNaN(area) || area < 0) {
        throw ApiError.badRequest('Total area in acres must be greater than or equal to 0.');
      }
      farm.totalAreaAcres = area;
    }

    if (updateData.location !== undefined) {
      validateCoordinates(updateData.location);
      if (updateData.location.latitude !== undefined) {
        farm.location.latitude = updateData.location.latitude !== null && updateData.location.latitude !== '' ? Number(updateData.location.latitude) : undefined;
      }
      if (updateData.location.longitude !== undefined) {
        farm.location.longitude = updateData.location.longitude !== null && updateData.location.longitude !== '' ? Number(updateData.location.longitude) : undefined;
      }
      if (updateData.location.address !== undefined) {
        farm.location.address = typeof updateData.location.address === 'string' ? updateData.location.address.trim() : '';
      }
    }

    if (updateData.description !== undefined) {
      farm.description = typeof updateData.description === 'string' ? updateData.description.trim() : '';
    }

    await farm.save();
    logger.info(`Farm updated: ${farm._id} by User ${userId}`);
    return farm.toJSON();
  },

  /**
   * Deletes a farm and cascades deletion to all its child Fields and Zones
   */
  async deleteFarm(userId, farmId) {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');

    const farm = await Farm.findOne({ _id: farmId, owner: userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found.');
    }

    // Cascade deletion: Delete child Zones, then child Fields, then Farm
    const zonesDeleteResult = await Zone.deleteMany({ farm: farmId, owner: userId });
    const fieldsDeleteResult = await Field.deleteMany({ farm: farmId, owner: userId });
    await Farm.deleteOne({ _id: farmId, owner: userId });

    logger.info(
      `Farm deleted: ${farmId} by User ${userId} (Cascaded: ${fieldsDeleteResult.deletedCount} fields, ${zonesDeleteResult.deletedCount} zones removed)`
    );

    return {
      deletedFarmId: farmId,
      cascadedFieldsCount: fieldsDeleteResult.deletedCount,
      cascadedZonesCount: zonesDeleteResult.deletedCount,
    };
  },

  /**
   * Retrieves complete farm overview including grouped fields and zones
   */
  async getFarmOverview(userId, farmId) {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');

    const farm = await Farm.findOne({ _id: farmId, owner: userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found.');
    }

    const fields = await Field.find({ farm: farmId, owner: userId }).sort({ createdAt: 1 });
    const zones = await Zone.find({ farm: farmId, owner: userId }).sort({ createdAt: 1 });

    const fieldsWithZones = fields.map((fieldDoc) => {
      const field = fieldDoc.toJSON();
      const childZones = zones
        .filter((z) => z.field.toString() === field.id || z.field.toString() === fieldDoc._id.toString())
        .map((z) => z.toJSON());
      return {
        ...field,
        zones: childZones,
      };
    });

    return {
      ...farm.toJSON(),
      fields: fieldsWithZones,
    };
  },
};

export default farmService;
