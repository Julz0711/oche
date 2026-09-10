import mongoose from 'mongoose';
import { seedAchievements } from './achievements/seed';
import { dbOptions } from './dbOptions';

type ConnectionCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
declare global { var mongoose: ConnectionCache | undefined; }
const cached = global.mongoose ??= { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, dbOptions).then(async connection => {
      await seedAchievements();
      cached.conn = connection;
      return connection;
    }).catch(error => {
      cached.promise = null;
      throw error;
    });
  }
  return cached.promise;
}
