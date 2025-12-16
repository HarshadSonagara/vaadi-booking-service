import { asyncHandler } from "../utils/asyncHandler.js";
import { ResetPasswordToken } from "../models/resetPasswordToken.model.js";
import { sendPasswordResetEmail } from "../utils/nodemailer.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { sendVerificationEmail } from "../utils/nodemailer.js";
import crypto from "crypto";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // Get user details from request body
  const { fullName, email, mobileNumber, villageName, password, frontendUrl } =
    req.body;

  // Validation - check if fields are not empty
  if (
    [fullName, email, mobileNumber, villageName, password].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Validate frontendUrl
  if (!frontendUrl || frontendUrl.trim() === "") {
    throw new ApiError(400, "Frontend URL is required for email verification");
  }

  // Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ email }, { mobileNumber }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or mobile number already exists");
  }

  // Create user object - create entry in db
  const user = await User.create({
    fullName,
    email,
    mobileNumber,
    villageName,
    password,
    isEmailVerified: false,
    role: "Admin", // Default role
  });

  // Generate email verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send verification email
  try {
    await sendVerificationEmail(
      email,
      fullName,
      verificationToken,
      frontendUrl
    );
  } catch (error) {
    // If email fails, we still created the user, just log the error
    console.error("Failed to send verification email:", error);
    // Optional: You can delete the user or handle this differently
  }

  // Remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken"
  );

  // Check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // Return response
  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        createdUser,
        "User registered successfully. Please check your email to verify your account."
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  // Get login credentials from request body
  const { email, password } = req.body;

  // Validation
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  // Find the user
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // Check password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Update last login time
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Get user without password and refresh token
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Send cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  // Hash the token to compare with database
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user with valid token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  // Update user
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email verified successfully"));
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email, frontendUrl } = req.body;

  if (!email || !frontendUrl) {
    throw new ApiError(400, "Email and frontend URL are required");
  }

  // Find user
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  // Generate new verification token
  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send verification email
  try {
    await sendVerificationEmail(
      user.email,
      user.fullName,
      verificationToken,
      frontendUrl
    );
  } catch (error) {
    throw new ApiError(500, "Failed to send verification email");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Verification email sent successfully. Please check your inbox."
      )
    );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (user) {
    // Generate valid token
    const token = crypto.randomBytes(32).toString("hex");

    // Hash token for storage
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Save to DB (model handles hashing)
    await ResetPasswordToken.create({
      userId: user._id,
      token: hashedToken,
    });

    // Send email
    try {
      await sendPasswordResetEmail(
        user.email,
        user.fullName,
        token,
        req.headers.origin || "http://localhost:4200"
      );
    } catch (error) {
      console.error("Failed to send reset email:", error);
      // We don't throw error to avoid enumerating users, or we can if we want to be explicit
    }
  }

  // Always return success to prevent email enumeration
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "If an account with that email exists, we have sent a password reset link."
      )
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, "Token and new password are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const resetTokenDoc = await ResetPasswordToken.findOne({
    token: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!resetTokenDoc) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const user = await User.findById(resetTokenDoc.userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = newPassword;
  await user.save(); // Will trigger pre-save hash

  // Delete all reset tokens for this user? Or just this one? Just this one.
  await ResetPasswordToken.deleteMany({ userId: user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
};
