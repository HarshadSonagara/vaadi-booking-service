import { Router } from "express";
import {
  getAllHalls,
  getHallById,
  createHall,
  updateHall,
  deleteHall,
} from "../controllers/hall.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// CRUD routes
router.route("/").get(getAllHalls).post(createHall);
router.route("/:id").get(getHallById).put(updateHall).delete(deleteHall);

export default router;
