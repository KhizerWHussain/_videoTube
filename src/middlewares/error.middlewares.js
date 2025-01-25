import mongoose from "mongoose";
import { APIError } from "../utils/error.response.js";

const handleErrorsSync = (err, req, res, next) => {
  let error = err;

  // Wrap non-APIError errors into APIError
  if (!(err instanceof APIError)) {
    const code =
      error?.statusCode || error instanceof mongoose.Error ? 400 : 500;

    const message = error?.message || "Something went wrong!";
    error = new APIError(code, message, error?.errors || [], err?.stack);
  }

  // Ensure `statusCode` has a fallback
  const statusCode = error?.statusCode || 500;

  // Build the response
  const response = {
    success: false,
    statusCode,
    message: error.message || "An unexpected error occurred",
    ...(process.env.NODE_ENV === "development" ? { stack: error?.stack } : {}),
  };

  // Return the response
  return res.status(statusCode).json(response);
};

export { handleErrorsSync };
