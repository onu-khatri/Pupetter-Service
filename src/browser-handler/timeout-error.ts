export class timeoutError extends Error {  
  private status = 408;
  constructor (message: string, public timeoutTime: number) {
    super(message)

    // assign the error class name in your custom error (as a shortcut)
    this.name = this.constructor.name

    // capturing the stack trace keeps the reference to your error class
    Error.captureStackTrace(this, this.constructor);
  }

  statusCode() {
    return this.status
  }
}