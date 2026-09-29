import http from "node:http";
import { config } from "./config.js";
import { connectDB, disconnectDB } from "./db.js";
import app from "./app.js";
import { attachSignaling } from "./realtime/signaling.js";
import { ensureDemoCatalog } from "./seed/demoData.js";

async function start() {
  try {
    await connectDB();
    console.log("MongoDB connected");
  } catch (error) {
    console.error(`Could not connect to MongoDB: ${error.message}`);
    console.error("Is MongoDB running? Check MONGODB_URI in backend/.env");
    process.exit(1);
  }

  // In local development the catalog is created automatically so a fresh install
  // immediately has companies + jobs to test. Set SEED_DEMO=false to disable it.
  if (!config.isProd && process.env.SEED_DEMO !== "false") {
    try {
      const result = await ensureDemoCatalog();
      console.log(`Demo catalog ready: ${result.companies} companies, ${result.createdJobs} new jobs.`);
    } catch (error) {
      console.error(`Demo catalog setup failed: ${error.message}`);
    }
  }

  // http.createServer(app) instead of app.listen(...) so the WebRTC signaling
  // server (Socket.IO) can share the same port as the REST API.
  const httpServer = http.createServer(app);
  attachSignaling(httpServer);

  httpServer.listen(config.port, () => {
    console.log(`JobTrack API listening on http://localhost:${config.port}  (${config.env})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    httpServer.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
