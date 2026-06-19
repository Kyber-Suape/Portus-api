import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { apiRouter } from "./modules";
import { errorHandler } from "./shared/middlewares/errorHandler";
import { globalRateLimiter } from "./shared/middlewares/rateLimiter";
import { notFoundHandler } from "./shared/middlewares/notFoundHandler";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(globalRateLimiter);

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, data: { status: "ok" }, message: "Portus API no ar." });
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
