import { Router } from "express";
import { register, logout } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { authGuard } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  register
);

router.route("/logout").post(authGuard, logout);

export default router;
