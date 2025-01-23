import dotenv from "dotenv";
import { app } from "./app.js";
import establishDatabaseConnection from "./db/index.js";

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 8001;

establishDatabaseConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log("mongodb connection error ==>", error);
  });
