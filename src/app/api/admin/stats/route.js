import { apiResponse } from "@/utils/apiResponse";
import { verifyAdminSecret } from "@/utils/adminAuth";
import { WS_HTTP_URL } from "@/constants/config";

export async function GET(request) {
  try {
    const secret = request.headers.get("x-admin-secret");
    const configuredSecret = process.env.ADMIN_SECRET;
    
    if (!verifyAdminSecret(secret)) {
      return apiResponse.unauthorized("Authentication required");
    }

    const baseUrl = WS_HTTP_URL.replace(/\/$/, "");
    const url = `${baseUrl}/stats`;
    
    const res = await fetch(url, {
      headers: { "x-admin-secret": configuredSecret },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
       return apiResponse.internalError(`Internal service failure (HTTP ${res.status})`);
    }

    const data = await res.json();
    return apiResponse.success({
      ...data,
      internalNode: baseUrl,
    });
  } catch (err) {
    return apiResponse.internalError(err.message || "Telemetry service unreachable");
  }
}