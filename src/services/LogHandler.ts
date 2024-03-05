const SimpleNodeLogger = require('simple-node-logger');

/* The LogHandler class is a singleton that creates and manages a global logger object for logging
messages to a file. */
export class LogHandler {
  globalLogger: any;
  private static globalLogHandlerObj: LogHandler;

  private constructor() {
    this.globalLogger = SimpleNodeLogger.createSimpleLogger({
      logFilePath:'./logfile.log',
      timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
    });
  }

  /* The line `public static getLogHandler = () => this.globalLogHandlerObj;` is defining a static
  method called `getLogHandler` that returns the value of the `globalLogHandlerObj` property. */
  public static getLogHandler = () => this.globalLogHandlerObj;

  /**
   * The function creates and returns a global log handler object if it doesn't already exist.
   * @returns The method is returning an instance of the LogHandler class.
   */
  public static createLogHandler(): LogHandler {
    if (!this.globalLogHandlerObj) {
      LogHandler.globalLogHandlerObj = new LogHandler();
    }

    return LogHandler.globalLogHandlerObj;
  }
}