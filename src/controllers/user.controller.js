import { handlerAsync } from "../utils/asynchandler.js";
import { APIError } from "../utils/error.response.js";
import { User } from "../models/user.model.js";
import {
  deletefromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary/index.js";
import { APIResponse } from "../utils/api.response.js";
import jwt from "jsonwebtoken";

const getAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      return null;
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: true });

    return { accessToken, refreshToken };
  } catch (error) {
    console.log("error ==>", error);
    throw new APIError(500);
  }
};

const register = handlerAsync(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  if (
    [fullname, email, username, password].some(
      (field) => field?.trim() === "" || !field
    )
  ) {
    throw new APIError(409, "All fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new APIError(409, "user already exist");
  }

  const avatartLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatartLocalPath) {
    throw new APIError(404, "missing avatar file");
  }

  let avatar;
  try {
    avatar = await uploadOnCloudinary(avatartLocalPath);
  } catch (error) {
    console.log("error uploading avatart ==>", error);
    throw new APIError(500, "failed to upload avatar");
  }

  let coverImage;
  try {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  } catch (error) {
    console.log("error uploading coverImage ==>", error);
    throw new APIError(500, "failed to upload coverImage");
  }

  try {
    const user = await User.create({
      fullname,
      username,
      avatar: avatar.url,
      coverImage: coverImage.url || "",
      email,
      password,
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new APIError(500);
    }

    return res
      .status(201)
      .json(new APIResponse(201, createdUser, "user registered successfully"));
  } catch (error) {
    console.log("user creation failed ==>", error);

    if (avatar) {
      await deletefromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deletefromCloudinary(coverImage.public_id);
    }

    throw new APIError(500);
  }
});

const login = handlerAsync(async (req, res) => {
  const { email, username, password } = req.body;

  if (!email) {
    throw new APIError(400, "Email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new APIError(404, "user not found");
  }

  const validPassword = await user.isPasswordCorrect(password);

  if (!validPassword) {
    throw new APIError(401, "invalid credentials");
  }

  const { accessToken, refreshToken } = await getAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!loggedInUser) {
    throw new APIError(404, "loggedin user not found");
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new APIResponse(
        200,
        {
          user: loggedInUser,
          refreshToken,
        },
        "User loggedin successfully"
      )
    );
});

const refreshAccessToken = handlerAsync(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new APIError(401, "refresh token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.Refresh_Token_Secret
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new APIError(401, "invalid refresh token");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new APIError(401, "expired refresh token");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await getAccessAndRefreshToken(user?._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new APIResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    console.log("error decoding token ==>", error);
    throw new APIError(500);
  }
});

const logout = handlerAsync(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, {}, "user logged out successfully"));
});

export { register, login, refreshAccessToken, logout };
