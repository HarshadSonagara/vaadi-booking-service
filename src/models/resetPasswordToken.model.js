import mongoose, { Schema } from "mongoose";

const resetPasswordTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => Date.now() + 3600000, // 1 hour from now
    },
  },
  {
    timestamps: true,
  }
);

// Hash token before saving - using SHA256 for deterministic lookup
resetPasswordTokenSchema.pre("save", function (next) {
  // If token is modified (or new)
  if (!this.isModified("token")) return next();
  next();
});

resetPasswordTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ResetPasswordToken = mongoose.model(
  "ResetPasswordToken",
  resetPasswordTokenSchema
);
