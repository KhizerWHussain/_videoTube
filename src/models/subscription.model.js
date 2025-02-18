import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // subscriber is also channel and user is also channel
      ref: "User",
    },
  },
  { timestamps: true, versionKey: true, minimize: true, capped: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
