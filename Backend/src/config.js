import dotenv from "dotenv";

dotenv.config({ quiet: true });

const env = process.env.NODE_ENV || "development";
const isProd = env === "production";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

const jwtSecret = required("JWT_SECRET");
if (isProd && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production.");
}

export const config = {
  env,
  isProd,
  isTest: env === "test",
  port: Number(process.env.PORT) || 5000,
  mongoUri: required("MONGODB_URI"),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  // Comma separated list of allowed browser origins, e.g. "http://localhost:5173,https://jobtrack.app"
  clientOrigins: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
