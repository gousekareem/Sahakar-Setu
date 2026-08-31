import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import pinoHttp from "pino-http";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { loginLimiter } from "./middlewares/rateLimit.js";
import { logger } from "./lib/logger.js";

const app = express();
const startedAt = Date.now();
const metrics = { requests: 0, errors: 0 };
app.use((req, res, next) => { metrics.requests++; next(); });

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*", credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(process.env.NODE_ENV === "production" ? pinoHttp({ logger }) : morgan("dev"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/v1/metrics", (req, res) => {
  res.json({
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    requestsServed: metrics.requests,
    errorsServed: metrics.errors,
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });
});

app.use("/api/v1/auth/login", loginLimiter);
app.use("/api/v1", routes);

app.use(notFound);
app.use((err, req, res, next) => { metrics.errors++; errorHandler(err, req, res, next); });

export default app;
