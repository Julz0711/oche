// Each server instance has two clients (Mongoose and the auth/native client).
// Pool caps apply per client, per server in the MongoDB topology, not globally.
export const dbOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 30_000,
  waitQueueTimeoutMS: 5_000,
  serverSelectionTimeoutMS: 5_000,
};
