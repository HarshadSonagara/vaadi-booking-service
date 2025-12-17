import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Village } from "../models/village.model.js";

const createVillage = asyncHandler(async (req, res) => {
  const { name, state, country, pincode } = req.body;

  if ([name, state, country, pincode].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedVillage = await Village.findOne({
    $or: [{ name }, { pincode }],
  });

  if (existedVillage) {
    throw new ApiError(409, "Village with this name or pincode already exists");
  }

  const village = await Village.create({
    name,
    state,
    country,
    pincode,
  });

  if (!village) {
    throw new ApiError(500, "Something went wrong while registering the village");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, village, "Village created successfully"));
});

const getAllVillages = asyncHandler(async (req, res) => {
  const villages = await Village.find({});
  return res
    .status(200)
    .json(new ApiResponse(200, villages, "Villages fetched successfully"));
});

const updateVillage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, state, country, pincode } = req.body;

  if (!id) {
    throw new ApiError(400, "Village ID is required");
  }

  const village = await Village.findByIdAndUpdate(
    id,
    {
      $set: {
        name,
        state,
        country,
        pincode,
      },
    },
    { new: true }
  );

  if (!village) {
    throw new ApiError(404, "Village not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, village, "Village updated successfully"));
});

const deleteVillage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Village ID is required");
  }

  const village = await Village.findByIdAndDelete(id);

  if (!village) {
    throw new ApiError(404, "Village not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Village deleted successfully"));
});

export { createVillage, getAllVillages, updateVillage, deleteVillage };
