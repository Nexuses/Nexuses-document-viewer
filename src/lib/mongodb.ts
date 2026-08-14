import { MongoClient, MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

// Helper function to properly encode MongoDB URI password
function encodeMongoURI(uri: string): string {
  // Handle case where password contains @ and creates double @@
  // Pattern: mongodb+srv://username:password@@host
  // Example: mongodb+srv://user:pass@word@@host -> mongodb+srv://user:pass%40word@host
  if (uri.includes('@@')) {
    const doubleAtIndex = uri.indexOf('@@');
    const beforeDoubleAt = uri.substring(0, doubleAtIndex);
    const afterDoubleAt = uri.substring(doubleAtIndex + 2);

    const colonIndex = beforeDoubleAt.lastIndexOf(':');
    if (colonIndex > 0) {
      const prefix = uri.substring(0, colonIndex + 1);
      const password = beforeDoubleAt.substring(colonIndex + 1);
      return prefix + encodeURIComponent(password) + '@' + afterDoubleAt;
    }
  }

  return uri;
}

const uri = encodeMongoURI(process.env.MONGODB_URI);
const options: MongoClientOptions = {
  // Avoid IPv6/TLS handshake failures on some Windows networks
  family: 4,
  serverSelectionTimeoutMS: 15000,
};

let clientPromise: Promise<MongoClient>;

function connectClient(): Promise<MongoClient> {
  const client = new MongoClient(uri, options);
  return client.connect().catch((err) => {
    // Do not cache a rejected promise — a later IP/password/TLS fix would never retry
    if (process.env.NODE_ENV === 'development') {
      const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
      };
      globalWithMongo._mongoClientPromise = undefined;
    }
    throw err;
  });
}

if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = connectClient();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  clientPromise = connectClient();
}

export default clientPromise;
