/**
 * Error whose `message` is already safe and useful to show directly to a Discord
 * user. Anything that is NOT a `UserFacingError` is treated as an internal bug:
 * logged with a stack trace, shown to the user as a generic message.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

/** The tarkov.dev API was unreachable or kept failing after all retries. */
export class ApiUnavailableError extends UserFacingError {
  constructor(
    message = "The tarkov.dev API is unavailable right now. Please try again in a minute.",
  ) {
    super(message);
    this.name = "ApiUnavailableError";
  }
}
