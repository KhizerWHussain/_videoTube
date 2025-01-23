import mongoose from "mongoose";
import { databaseName } from "../constants.js";

const establishDatabaseConnection = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${databaseName}`
    );

    console.log(
      `\n Mongodb connected! DB Host ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("mongodb connection error ==>", error);
    process.exit(1);
  }
};

export default establishDatabaseConnection;
