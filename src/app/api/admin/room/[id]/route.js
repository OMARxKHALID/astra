import { apiResponse } from "@/utils/apiResponse";
import { adminAuth } from "@/utils/adminAuth";
import { WS_HTTP_URL } from "@/constants/config";

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const secret = request.headers.get("x-admin-secret");
    const configuredSecret = process.env.ADMIN_SECRET;
    
    if (!adminAuth(secret)) {
      return apiResponse.unauthorized("Authentication required");
    }

    const baseUrl = WS_HTTP_URL.replace(/\/$/, "");
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
