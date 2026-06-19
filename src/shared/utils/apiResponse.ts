import type { ApiSuccessResponse } from "../types/api";

export function success<T>(data: T, message = "OK"): ApiSuccessResponse<T> {
  return { success: true, data, message };
}
