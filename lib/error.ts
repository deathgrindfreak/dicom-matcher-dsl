export class ScanError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ScanError.prototype);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ParseError.prototype);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
