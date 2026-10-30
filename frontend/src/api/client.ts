const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export type ApiErrorBody = {
  detail?: string;
  non_field_errors?: string[];
  [field: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(getErrorMessage(status, body));
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type ApiRequestOptions = RequestInit & {
  accessToken?: string;
};

export const apiRequest = async <T>(
  path: string,
  { accessToken, ...options }: ApiRequestOptions = {}
): Promise<T> => {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: options.credentials ?? "include",
    headers,
  });
  const body = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(response.status, isApiErrorBody(body) ? body : null);
  }

  return body as T;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) return text;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const isApiErrorBody = (value: unknown): value is ApiErrorBody =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getErrorMessage = (status: number, body: ApiErrorBody | null): string => {
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.non_field_errors) && body.non_field_errors[0]) {
    return body.non_field_errors[0];
  }
  return `Request failed with status ${status}`;
};
