import { StorageCore } from "../storage/storage-core";
import { apiRefresh } from "./auth-api.client";
import { isTokenExpired } from "../auth/auth-utils";

let refreshPromise: Promise<string> | null = null;

export async function fetchClient<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = await StorageCore.get(StorageCore.KEYS.ACCESS_TOKEN);

  const headers = new Headers(options.headers || {});
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (
    !headers.has("Content-Type") &&
    options.method &&
    options.method !== "GET"
  ) {
    headers.set("Content-Type", "application/json");
  }

  const config = { ...options, headers };
  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (e: any) {
    console.error("[FetchClient] Fetch failed:", e);
    if (e?.message?.includes("Failed to fetch")) {
      throw new Error("Something went wrong (Network Error)");
    }
    throw e;
  }

  if (response.status === 401) {
    const refreshToken = await StorageCore.get(StorageCore.KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      await StorageCore.clearSession();
      throw new Error("Session expired: No refresh token");
    }

    if (!refreshPromise) {
      refreshPromise = (async () => {
        const keys = StorageCore.KEYS;
        try {
          const refreshExpiresAt = await StorageCore.get(
            keys.REFRESH_EXPIRES_AT,
          );

          if (isTokenExpired(refreshExpiresAt)) {
            console.warn(
              "[FetchClient] Local Refresh check: Token expired. Skipping API call.",
            );
            await StorageCore.clearSession();
            throw new Error("Session expired: Local check");
          }

          const refreshRes = await apiRefresh(refreshToken);
          await StorageCore.setMultiple({
            [keys.ACCESS_TOKEN]: refreshRes.AccessToken,
            [keys.REFRESH_TOKEN]: refreshRes.RefreshToken,
            [keys.REFRESH_EXPIRES_AT]: refreshRes.RefreshExpiresAt,
          });
          return refreshRes.AccessToken;
        } catch (e: any) {
          console.error("[FetchClient] Refresh failed:", e);

          const msg = e.message || "";
          const isAuthError =
            msg.includes("401") ||
            msg.includes("403") ||
            msg.toLowerCase().includes("invalid") ||
            msg.toLowerCase().includes("revoked") ||
            msg.toLowerCase().includes("expired");

          if (isAuthError) {
            await StorageCore.clearSession();
          }
          throw e;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    try {
      const newToken = await refreshPromise;
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(url, { ...options, headers });
    } catch {
      throw new Error("Session expired");
    }
  }

  if (!response.ok) {
    const text = (await response.text()).trim();
    let errorMsg = text || `API Error: ${response.status}`;

    try {
      const json = JSON.parse(text);
      errorMsg =
        json.MESSAGE || json.message || json.Error || json.error || errorMsg;
      if (typeof errorMsg !== "string" && errorMsg) {
        errorMsg = JSON.stringify(errorMsg);
      }
    } catch {
      // Not valid JSON or parsing failed
    }

    const error = new Error(errorMsg);
    (error as any).status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}
