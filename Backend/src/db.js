import mongoose from "mongoose";
import { config } from "./config.js";

// Defence in depth against NoSQL operator injection ({ "$gt": "" } in a filter).
mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

export async function connectDB() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
