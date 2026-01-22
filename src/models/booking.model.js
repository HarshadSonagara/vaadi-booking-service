import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
  {
    villagerName: {
      type: String,
      required: [true, "Villager name is required"],
      trim: true,
      index: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
    },
    hallId: {
      type: Schema.Types.ObjectId,
      ref: "Hall",
      required: [true, "Hall is required"],
      index: true,
    },
    hallName: {
      type: String,
      required: [true, "Hall name is required"],
      trim: true,
    },
    bookingReason: {
      type: String,
      required: [true, "Booking reason is required"],
      trim: true,
    },
    fromDate: {
      type: Date,
      required: [true, "From date is required"],
      index: true,
    },
    toDate: {
      type: Date,
      required: [true, "To date is required"],
      index: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: [1, "Total days must be at least 1"],
    },
    price: {
      type: Number,
      required: [true, "Booking price is required"],
      min: [0, "Price cannot be negative"],
    },
    villageName: {
      type: String,
      required: [true, "Village name is required"],
      trim: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
bookingSchema.index({ villageName: 1, fromDate: 1, toDate: 1 });
bookingSchema.index({ hallId: 1, fromDate: 1, toDate: 1, isCancelled: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);
