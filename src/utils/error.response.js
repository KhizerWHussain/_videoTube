class APIError extends Error {
  constructor(code, message = "Something went wrong", errors = [], stack = "") {
    super(message);
    this.statusCode = code;
    this.data = null;
    this.message = message;
    this.succcess = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { APIError };
