import mongoose from "mongoose";

export function getMongoUri(): string {
  let uri = process.env.MONGODB_URI || "mongodb://localhost:27017/SmartStartPM";
  if (uri.includes("=") && !uri.startsWith("mongodb")) {
    uri = uri.substring(uri.indexOf("=") + 1).trim();
  }
  return uri;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const uri = getMongoUri();
  if (!uri.startsWith("mongodb")) {
    throw new Error(
      "Invalid MONGODB_URI — expected a mongodb:// or mongodb+srv:// connection string"
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const isLocal = uri.includes("localhost") || uri.includes("127.0.0.1");
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: isLocal ? 2000 : 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: isLocal ? 2000 : 30000,
      family: 4,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongoose) => {
        return mongoose;
      })
      .catch((error) => {
        console.error("❌ MongoDB connection failed:", error.message);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("❌ MongoDB connection error:", e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;

// Export alias for compatibility
export { connectDB as connectToDatabase };

/**
 * Safe connection that doesn't throw errors in development
 */
export async function connectDBSafe() {
  try {
    return await connectDB();
  } catch (error) {
    console.warn(
      "⚠️ MongoDB connection failed, running in offline mode:",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Disconnect from MongoDB
 * Useful for testing or graceful shutdowns
 */
export async function disconnectDB() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

/**
 * Check if MongoDB is connected
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Get connection status
 */
export function getConnectionStatus(): string {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return (
    states[mongoose.connection.readyState as keyof typeof states] || "unknown"
  );
}

// Handle connection events
mongoose.connection.on("connected", () => {});

mongoose.connection.on("error", (err) => {
  console.error("🔴 Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {});

// Handle process termination
process.on("SIGINT", async () => {
  await mongoose.connection.close();

  process.exit(0);
});
