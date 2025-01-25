import { Router } from "express";
import {
  register,
  logout,
  login,
  getUser,
  refreshAccessToken,
  changePassword,
  updateAccountDetails,
  updateProfileAvatar,
  updateProfileCover,
  getChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
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

router
  .route("/update-avatar")
  .patch(authGuard, upload.single("file"), updateProfileAvatar);

router
  .route("/update-cover")
  .patch(authGuard, upload.single("file"), updateProfileCover);

router.route("/logout").post(authGuard, logout);

router.route("/login").post(authGuard, login);

router.route("/getMe").get(authGuard, getUser);

router.route("/refresh-access-token").post(authGuard, refreshAccessToken);

router.route("/update-password").patch(authGuard, changePassword);

router.route("/update-account-details").patch(authGuard, updateAccountDetails);

router.route("/channel-profile/:username").get(authGuard, getChannelProfile);

router.route("/watch-history").get(authGuard, getWatchHistory);

export default router;
