// lib/mongodb-client.ts
import { MongoClient } from 'mongodb';
import { dbOptions } from './dbOptions';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI not set');
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, dbOptions).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, dbOptions).connect();
}

export default clientPromise;
