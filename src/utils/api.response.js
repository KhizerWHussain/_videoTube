class APIResponse {
  constructor(code, data, message = "Success") {
    this.statusCode = code;
    this.data = data;
    this.message = message;
    this.sucess = code < 400;
  }
}

export { APIResponse };
