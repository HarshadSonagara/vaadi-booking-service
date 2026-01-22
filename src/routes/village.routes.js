import { Router } from "express";
import {
  createVillage,
  getAllVillages,
  updateVillage,
  deleteVillage,
  getVillagesPublic,
} from "../controllers/village.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public route - no auth required (for registration dropdown)
router.route("/public").get(getVillagesPublic);

// Protected routes
router.use(verifyJWT);

router.route("/").get(getAllVillages).post(createVillage);
router.route("/:id").put(updateVillage).delete(deleteVillage);

export default router;
