export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export class AuthenticationError extends HttpError {
  constructor(message = "A known demo persona ID is required.") {
    super(401, "unknown_identity", message);
  }
}

export class AuthorizationError extends HttpError {
  constructor(message = "This persona is not allowed to perform that action.") {
    super(403, "forbidden", message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found.") {
    super(404, "not_found", message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, "conflict", message);
  }
}
