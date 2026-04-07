import { apiResponse } from "@/utils/apiResponse";
import { verifyAdminSecret } from "@/utils/adminAuth";

const getInternalUrl = () => {
  if (process.env.WS_HTTP_URL) return process.env.WS_HTTP_URL.replace(/\/$/, "");
  
  const publicUrl = process.env.NEXT_PUBLIC_WS_URL || "http://127.0.0.1:3001";
  return publicUrl
    .replace(/^ws/, "http") // handles ws -> http and wss -> https
    .replace(/\/socket\.io\/?$/, "")
    .replace(/\/$/, "");
};

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const secret = request.headers.get("x-admin-secret");
    const configuredSecret = process.env.ADMIN_SECRET;
    
    if (!verifyAdminSecret(secret)) {
      return apiResponse.unauthorized("Authentication required");
    }

    const baseUrl = getInternalUrl();
    const url = `${baseUrl}/rooms/${id}`;
    
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "x-admin-secret": configuredSecret },
      cache: "no-store",
    });

    if (!res.ok) {
       return apiResponse.internalError(`Backend responded with ${res.status}`);
    }

    const data = await res.json();
    return apiResponse.success(data);
  } catch (err) {
    return apiResponse.internalError(err.message || "Failed to terminate room");
  }
}
