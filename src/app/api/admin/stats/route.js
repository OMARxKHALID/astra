import { apiResponse } from "@/utils/apiResponse";
import { verifyAdminSecret } from "@/utils/adminAuth";

const getInternalUrl = () => {
  if (process.env.WS_HTTP_URL) return process.env.WS_HTTP_URL.replace(/\/$/, "");
  
  const publicUrl = process.env.NEXT_PUBLIC_WS_URL || "http://127.0.0.1:3001";
  return publicUrl
    .replace(/^ws/, "http") // [Note] handles ws -> http and wss -> https
    .replace(/\/socket\.io\/?$/, "")
    .replace(/\/$/, "");
};

export async function GET(request) {
  try {
    const secret = request.headers.get("x-admin-secret");
    const configuredSecret = process.env.ADMIN_SECRET;
    
    if (!verifyAdminSecret(secret)) {
      return apiResponse.unauthorized("Authentication required");
    }

    const baseUrl = getInternalUrl();
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