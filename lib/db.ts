// lib/db.ts
import mongoose from 'mongoose';
import { seedAchievements } from './achievements/seed';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not set');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }

  cached.conn = await cached.promise;

  // Seed achievements on initial connection
  await seedAchievements();

  return cached.conn;
}

declare global {
  var mongoose: any;
}
