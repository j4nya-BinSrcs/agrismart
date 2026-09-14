import mongoose from 'mongoose';
import Farm, { IFarm, IFarmView, FarmMember } from '../models/Farm.js';
import Field, { IFieldView } from '../models/Field.js';
import Zone from '../models/Zone.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export const validateObjectId = (id: unknown, name = 'Resource ID') => {
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest(`Invalid ${name} format.`);
  }
};

export interface FarmInput {
  name?: unknown;
  description?: unknown;
  totalAreaAcres?: unknown;
  state?: unknown;
  district?: unknown;
  location?: {
    latitude?: unknown;
    longitude?: unknown;
    address?: unknown;
  };
}

export interface AddMemberInput {
  userId: string;
  role: 'owner' | 'farmer' | 'manager' | 'agronomist';
}

const validateCoordinates = (location?: FarmInput['location']) => {
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

const toFarmView = (farm: InstanceType<typeof Farm>): IFarmView =>
  farm.toJSON() as unknown as IFarmView;

export const farmService = {
  /**
   * Creates a new Farm owned by the authenticated user (as owner)
   */
  async createFarm(userId: string, data: FarmInput = {}): Promise<IFarmView> {
    validateObjectId(userId, 'User ID');

    const { name, location, totalAreaAcres, description, state, district } = data;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw ApiError.badRequest('Farm name is required and cannot be empty.');
    }

    if (totalAreaAcres === undefined || totalAreaAcres === null || isNaN(Number(totalAreaAcres)) || Number(totalAreaAcres) < 0) {
      throw ApiError.badRequest('Total area in acres is required and must be greater than or equal to 0.');
    }

    validateCoordinates(location);

    const stateValue = typeof state === 'string' ? state.trim() : undefined;
    const districtValue = typeof district === 'string' ? district.trim() : undefined;
    const addressFallback =
      typeof location?.address === 'string' && location.address.trim()
        ? location.address.trim()
        : [districtValue, stateValue].filter(Boolean).join(', ');

    const farmData: IFarm = {
      name: name.trim(),
      totalAreaAcres: Number(totalAreaAcres),
      description: typeof description === 'string' ? description.trim() : '',
      state: stateValue,
      district: districtValue,
      location: {
        latitude: location?.latitude !== undefined && location.latitude !== null && location.latitude !== '' ? Number(location.latitude) : undefined,
        longitude: location?.longitude !== undefined && location.longitude !== null && location.longitude !== '' ? Number(location.longitude) : undefined,
        address: addressFallback,
      },
      members: [{
        user: new mongoose.Types.ObjectId(userId),
        role: 'owner',
        addedAt: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const farm = await Farm.create(farmData);
    logger.info(`Farm created: ${farm.name} (ID: ${farm._id}) by User ${userId}`);
    return toFarmView(farm);
  },

  /**
   * Retrieves all farms where the user is a member
   */
  async getFarmsByUser(userId: string): Promise<IFarmView[]> {
    validateObjectId(userId, 'User ID');
    const farms = await Farm.find({ 'members.user': userId }).sort({ createdAt: -1 });
    return farms.map((f) => toFarmView(f));
  },

  /**
   * Retrieves a specific farm where the user is a member
   */
  async getFarmById(userId: string, farmId: string): Promise<IFarmView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    return toFarmView(farm);
  },

  /**
   * Updates a farm where the user is an owner
   */
  async updateFarm(userId: string, farmId: string, updateData: FarmInput = {}): Promise<IFarmView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    // Check if user is owner
    const userMember = farm.members.find(m => m.user.toString() === userId);
    if (!userMember || userMember.role !== 'owner') {
      throw ApiError.forbidden('Only farm owners can update farm details.');
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

    if (updateData.state !== undefined) {
      farm.state = typeof updateData.state === 'string' ? updateData.state.trim() : undefined;
    }

    if (updateData.district !== undefined) {
      farm.district = typeof updateData.district === 'string' ? updateData.district.trim() : undefined;
    }

    await farm.save();
    logger.info(`Farm updated: ${farm._id} by User ${userId}`);
    return toFarmView(farm);
  },

  /**
   * Adds a member to a farm (only owners can add members)
   */
  async addMember(userId: string, farmId: string, memberData: AddMemberInput): Promise<IFarmView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(memberData.userId, 'Member User ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    // Check if user is owner
    const userMember = farm.members.find(m => m.user.toString() === userId);
    if (!userMember || userMember.role !== 'owner') {
      throw ApiError.forbidden('Only farm owners can add members.');
    }

    // Check if user is already a member
    const existingMember = farm.members.find(m => m.user.toString() === memberData.userId);
    if (existingMember) {
      throw ApiError.badRequest('User is already a member of this farm.');
    }

    farm.members.push({
      user: new mongoose.Types.ObjectId(memberData.userId),
      role: memberData.role,
      addedAt: new Date(),
    });

    await farm.save();
    logger.info(`Member ${memberData.userId} added to Farm ${farmId} as ${memberData.role} by User ${userId}`);
    return toFarmView(farm);
  },

  /**
   * Removes a member from a farm (only owners can remove members)
   */
  async removeMember(userId: string, farmId: string, memberUserId: string): Promise<IFarmView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(memberUserId, 'Member User ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    // Check if user is owner
    const userMember = farm.members.find(m => m.user.toString() === userId);
    if (!userMember || userMember.role !== 'owner') {
      throw ApiError.forbidden('Only farm owners can remove members.');
    }

    // Cannot remove the last owner
    const memberToRemove = farm.members.find(m => m.user.toString() === memberUserId);
    if (!memberToRemove) {
      throw ApiError.notFound('Member not found in this farm.');
    }

    if (memberToRemove.role === 'owner') {
      const ownerCount = farm.members.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        throw ApiError.badRequest('Cannot remove the only owner of the farm.');
      }
    }

    farm.members = farm.members.filter(m => m.user.toString() !== memberUserId);
    await farm.save();
    logger.info(`Member ${memberUserId} removed from Farm ${farmId} by User ${userId}`);
    return toFarmView(farm);
  },

  /**
   * Updates a member's role (only owners can change roles)
   */
  async updateMemberRole(userId: string, farmId: string, memberUserId: string, newRole: 'owner' | 'farmer' | 'manager' | 'agronomist'): Promise<IFarmView> {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');
    validateObjectId(memberUserId, 'Member User ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    // Check if user is owner
    const userMember = farm.members.find(m => m.user.toString() === userId);
    if (!userMember || userMember.role !== 'owner') {
      throw ApiError.forbidden('Only farm owners can change member roles.');
    }

    const memberToUpdate = farm.members.find(m => m.user.toString() === memberUserId);
    if (!memberToUpdate) {
      throw ApiError.notFound('Member not found in this farm.');
    }

    // If demoting an owner, ensure there's at least one other owner
    if (memberToUpdate.role === 'owner' && newRole !== 'owner') {
      const ownerCount = farm.members.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        throw ApiError.badRequest('Cannot demote the only owner of the farm.');
      }
    }

    memberToUpdate.role = newRole;
    await farm.save();
    logger.info(`Member ${memberUserId} role updated to ${newRole} in Farm ${farmId} by User ${userId}`);
    return toFarmView(farm);
  },

  /**
   * Deletes a farm and cascades deletion to all its child Fields and Zones (only owners)
   */
  async deleteFarm(userId: string, farmId: string) {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    // Check if user is owner
    const userMember = farm.members.find(m => m.user.toString() === userId);
    if (!userMember || userMember.role !== 'owner') {
      throw ApiError.forbidden('Only farm owners can delete the farm.');
    }

    // Cascade deletion: Delete child Zones, then child Fields, then Farm
    const zonesDeleteResult = await Zone.deleteMany({ farm: farmId });
    const fieldsDeleteResult = await Field.deleteMany({ farm: farmId });
    await Farm.deleteOne({ _id: farmId });

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
  async getFarmOverview(userId: string, farmId: string) {
    validateObjectId(userId, 'User ID');
    validateObjectId(farmId, 'Farm ID');

    const farm = await Farm.findOne({ _id: farmId, 'members.user': userId });
    if (!farm) {
      throw ApiError.notFound('Farm not found or access denied.');
    }

    const fields = await Field.find({ farm: farmId }).sort({ createdAt: 1 });
    const zones = await Zone.find({ farm: farmId }).sort({ createdAt: 1 });

    const fieldsWithZones = fields.map((fieldDoc) => {
      const field = fieldDoc.toJSON() as unknown as IFieldView;
      const childZones = zones
        .filter((z) => z.field.toString() === field.id || z.field.toString() === fieldDoc._id.toString())
        .map((z) => z.toJSON());
      return {
        ...field,
        zones: childZones,
      };
    });

    return {
      ...toFarmView(farm),
      fields: fieldsWithZones,
    };
  },
};

export default farmService;