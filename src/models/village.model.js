import mongoose, { Schema } from "mongoose";

const villageSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Village name is required"],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Village = mongoose.model("Village", villageSchema);
