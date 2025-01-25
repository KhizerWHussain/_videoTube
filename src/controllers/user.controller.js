import { handlerAsync } from "../utils/asynchandler.js";
import { APIError } from "../utils/error.response.js";
import { User } from "../models/user.model.js";
import {
  deletefromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary/index.js";
import { APIResponse } from "../utils/api.response.js";
import jwt from "jsonwebtoken";
import { ObjectId } from "bson";

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

const changePassword = handlerAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req?.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new APIError(400, "old password is incorrect");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new APIResponse(200, {}, "password changed successfully"));
});

const getUser = handlerAsync(async (req, res) => {
  return res
    .status(200)
    .json(new APIResponse(200, req.user, "user details found"));
});

const updateAccountDetails = handlerAsync(async (req, res) => {
  const { fullname } = req.body;

  if (!fullname) {
    throw new APIError(400, "fullname is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullname },
    },
    {
      returnDocument: "after",
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new APIResponse(200, user, "user details updated successfully"));
});

const updateProfileAvatar = handlerAsync(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new APIError(400, "avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new APIError(500, "error uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new APIResponse(200, user, "avatar updated successfully"));
});

const updateProfileCover = handlerAsync(async (req, res) => {
  const coverImageFilePath = req.file?.path;

  if (!coverImageFilePath) {
    throw new APIError(400, "cover image is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageFilePath);

  if (!coverImage.url) {
    throw new APIError(500, "error uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new APIResponse(200, user, "cover image updated successfully"));
});

const getChannelProfile = handlerAsync(async (req, res) => {
  const { username } = await req?.params;

  if (!username?.trim()) {
    throw new APIError(400, "username is required");
  }

  const channel = await User.aggregate([
    {
      $match: { username: username.toLowerCase() },
    },
    {
      $limit: 1,
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        _count: {
          subscribers: { $size: "$subscribers" },
          subscribedTo: { $size: "$subscribedTo" },
        },
        isSubscribedOwnChannel: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        fullname: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        _count: 1,
        isSubscribedOwnChannel: 1,
      },
    },
  ]);

  if (!channel.length) {
    throw new APIError(404, "channel not found");
  }

  return res
    .status(200)
    .json(new APIResponse(200, channel[0], "channel profile found"));
});

const getWatchHistory = handlerAsync(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (!user.length) {
    throw new APIError(404, "user not found");
  }

  return res
    .json(200)
    .json(new APIResponse(200, user[0]?.watchHistory, "watch history found"));
});

export {
  register,
  login,
  refreshAccessToken,
  logout,
  changePassword,
  getUser,
  updateAccountDetails,
  updateProfileAvatar,
  updateProfileCover,
  getChannelProfile,
  getWatchHistory,
};
