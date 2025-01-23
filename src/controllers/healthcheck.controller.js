import { APIResponse } from "../utils/api.response.js";
import { handlerAsync } from "../utils/asynchandler.js";

const healthCheck = handlerAsync(async (req, res) => {
  return res
    .status(200)
    .json(new APIResponse(200, "ok", "Health Check Passed"));
});

export { healthCheck };
