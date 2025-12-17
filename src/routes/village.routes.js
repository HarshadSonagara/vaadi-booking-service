import { Router } from "express";
import {
  createVillage,
  getAllVillages,
  updateVillage,
  deleteVillage,
} from "../controllers/village.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Protect all routes

router.route("/").get(getAllVillages).post(createVillage);
router.route("/:id").put(updateVillage).delete(deleteVillage);

export default router;
