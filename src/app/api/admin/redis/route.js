import { apiResponse } from "@/utils/apiResponse";
import { adminAuth } from "@/utils/adminAuth";
import { redisCache } from "@/lib/redis";

export async function DELETE(request) {
  try {
    const secret = request.headers.get("x-admin-secret");

    if (!adminAuth(secret)) {
      return apiResponse.unauthorized("Authentication required");
    }

    if (!redisCache) {
      return apiResponse.error("Redis is not configured on this instance.", 400);
    }

    await redisCache.flushdb();
    
    return apiResponse.success({ message: "Redis database flushed successfully" });
  } catch (err) {
    return apiResponse.internalError(err.message);
  }
}
