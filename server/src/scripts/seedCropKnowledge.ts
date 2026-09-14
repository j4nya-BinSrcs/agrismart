import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import config from '../config/env.js';
import CropKnowledge from '../models/CropKnowledge.js';
import { cropKnowledgeSeed } from '../data/cropKnowledgeSeed.js';
import logger from '../utils/logger.js';

async function seedCropKnowledge() {
  logger.info(`Seeding CropKnowledge using MongoDB URI: ${config.mongodb.uri}`);

  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    logger.error('MongoDB is not connected. Aborting CropKnowledge seed.');
    process.exitCode = 1;
    return;
  }

  let upserted = 0;

  for (const entry of cropKnowledgeSeed) {
    const result = await CropKnowledge.findOneAndUpdate(
      { crop: entry.crop },
      {
        $set: {
          crop: entry.crop,
          diseases: entry.diseases,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    upserted += 1;
    logger.info(
      `Upserted CropKnowledge for "${entry.crop}" with ${entry.diseases.length} disease entries` +
        (result?._id ? ` (_id=${String(result._id)})` : '')
    );
  }

  logger.info(`CropKnowledge seed complete. Upserted ${upserted} crop document(s).`);
}

seedCropKnowledge()
  .catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`CropKnowledge seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
