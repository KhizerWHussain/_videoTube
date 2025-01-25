import jwt from "jsonwebtoken";
import { APIError } from "../utils/error.response.js";
import { User } from "../models/user.model.js";
import { handlerAsync } from "../utils/asynchandler.js";

export const authGuard = handlerAsync(async (req, res, next) => {
  const token =
    req.cookies.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new APIError(401, "unauthorized");
  }
  try {
    const decodedToken = jwt.verify(token, process.env.Access_Token_Secret);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new APIError(404, "user not found");
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("error decoding token ==>", error);
    throw new APIError(401, error?.message || "invalid access token");
  }
});
