import { ApiError } from "../utils/ApiError.js";

/**
 * Global error handler middleware
 * Converts all errors to JSON response format
 */
export const errorHandler = (err, req, res, next) => {
  // If it's an ApiError, use its properties
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
      data: null,
    });
  }

  // For other errors (unexpected), return 500
  console.error("Unexpected error:", err);
  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: err.message || "Internal Server Error",
    errors: [],
    data: null,
  });
};
