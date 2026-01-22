import { ApiError } from "../utils/ApiError.js";

/**
 * Check if user is Super Admin based on their role field
 */
export const isSuperAdmin = (user) => {
  return user && user.role === "Super Admin";
};

/**
 * Middleware to require Super Admin role
 * Must be used after verifyJWT middleware
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized - Please login");
  }

  if (!isSuperAdmin(req.user)) {
    throw new ApiError(403, "Access denied - Super Admin privileges required");
  }

  next();
};
