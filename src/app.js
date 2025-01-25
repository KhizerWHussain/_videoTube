import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// importing routes
import userRouter from "./routes/user.routes.js";
import { handleErrorsSync } from "./middlewares/error.middlewares.js";

const app = express();

const APP_PREFIX = "/api/v1";

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
// app.use(handleErrorsSync());
// app.use("/api/v1");

// routes
// import healthCheckRouter from "./routes/healthcheck.route.js";

// app.use("api/v1/healthcheck", healthCheckRouter);

app.use(`${APP_PREFIX}/user`, userRouter);

export { app };
