import { NextResponse } from "next/server";

export const apiResponse = {
  json(payload, { status = 200, headers } = {}) {
    return NextResponse.json(payload, { status, headers });
  },

  response(body = null, init = {}) {
    return new NextResponse(body, init);
  },

  success(data = {}, status = 200, options = {}) {
    return this.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      { status, ...options }
    );
  },

  error(
    message = "An unexpected error occurred",
    status = 500,
    code = "INTERNAL_ERROR",
    options = {},
  ) {
    console.error(`[API Error] ${status} ${code}: ${message}`);
    return this.json(
      {
        success: false,
        error: {
          message,
          code,
          status,
        },
        timestamp: new Date().toISOString(),
      },
      { status, ...options }
    );
  },

  badRequest(message = "Invalid request parameters", code = "BAD_REQUEST") {
    return this.error(message, 400, code);
  },

  unauthorized(message = "Unauthorized access", code = "UNAUTHORIZED") {
    return this.error(message, 401, code);
  },

  notFound(message = "Resource not found", code = "NOT_FOUND") {
    return this.error(message, 404, code);
  },

  methodNotAllowed(method) {
    return this.error(`Method ${method} not allowed`, 405, "METHOD_NOT_ALLOWED");
  },

  internalError(message = "Internal server error") {
    return this.error(message, 500, "INTERNAL_ERROR");
  }
};
