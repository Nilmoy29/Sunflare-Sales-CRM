export type ApiSuccess<T> = { data: T };

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function apiSuccess<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data } satisfies ApiSuccess<T>, init);
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  return Response.json(
    { error: { code, message, details } } satisfies ApiError,
    { status },
  );
}
