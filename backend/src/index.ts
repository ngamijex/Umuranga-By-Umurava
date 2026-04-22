import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { connectDB } from "./config/database";
import { corsOptionsFromEnv } from "./config/cors";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/error.middleware";

const app = express();
const PORT = process.env.PORT || 5000;

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(helmet());
app.use(cors(corsOptionsFromEnv()));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.get("/", (_req, res) => {
  res.json({
    service: "umuranga-backend",
    message: "API is under /api — use /health for a quick check.",
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "umuranga-backend", timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Umuranga backend running on http://localhost:${PORT}`);
  });
};

start();

export default app;
