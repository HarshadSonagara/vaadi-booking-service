import mongoose, { Schema } from "mongoose";

const hallSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Hall name is required"],
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    villageName: {
      type: String,
      required: [true, "Village name is required"],
      trim: true,
      index: true,
    },
    color: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
hallSchema.index({ villageName: 1, name: 1 });

export const Hall = mongoose.model("Hall", hallSchema);
