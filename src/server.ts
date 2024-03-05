import { existsSync, unlinkSync } from 'fs';
import * as path from 'path';
import App from './app';
import { Logger } from 'simple-node-logger';
import { LogHandler } from './services/LogHandler';
import { BrowserCluster } from './browser-handler/browser-cluster';

import * as dotenv from 'dotenv';

let server: any;
const app: App = new App();
let logger: Logger;
dotenv.config();

createHandler();
removeLogFile();

app.init()
  .then(() => {
    app.express.set('port', 3001);

    server = app.express.listen(3001, () => {
      console.log('Export app running on 3001!');
    });;
    server.on('error', serverError);

    handleProcessExit();
  })
  .catch((err: Error) => {
    logger.info('app.init error');
    logger.error(err.name);
    logger.error(err.message);
    logger.error(err.stack);
  });

function serverError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    throw error;
  }
  // handle specific error codes here.
  throw error;
}

function handleProcessExit(): void {
  process.on('SIGINT', async (signal) => await handleExit(signal));
  process.on('SIGQUIT', async (signal) => await handleExit(signal));
  process.on('SIGTERM', async (signal) => await handleExit(signal));
  process.on('unhandledRejection', (reason: Error) => {
    logger.error('Unhandled Promise Rejection: reason:', reason.message);
    logger.error(reason.stack);
    // application specific logging, throwing an error, or other logic here
  });

}

function createHandler(): void {
  logger = LogHandler.createLogHandler().globalLogger;
  createRunBrowserCluster();
}

function createRunBrowserCluster() {
  const browserConfig = {
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--headless",
      "--window-size=1280x1696",
      "--hide-scrollbars",
      '--enable-gpu'
    ],
  } as any;

  if (!!process.argv[2]) {
    browserConfig.executablePath = process.argv[2];
  }

  const clusterOptions = {
    maxWorkerNum: process.env.MAX_WORKER ? parseInt(process.env.MAX_WORKER, 10) : 10,
    minWorkerNum: process.env.MIN_WORKER ? parseInt(process.env.MIN_WORKER, 10) : 1
  };

  const sec = 1000;
  const minute = sec * 60;

  const browserWorkerOptions = {
    maxIdleTimeOfBrowser: process.env.MAX_IDLE_TIME_OF_BROWSER ? parseInt(process.env.MAX_IDLE_TIME_OF_BROWSER, 10) : 5 * minute,
    maxLifeSpanOfBrowser: process.env.MAX_LIFE_SPAN_OF_BROWSER ? parseInt(process.env.MAX_LIFE_SPAN_OF_BROWSER, 10) : 10 * minute,
    maxParallelTasks: process.env.MAX_PARALLEL_TASKS ? parseInt(process.env.MAX_PARALLEL_TASKS, 10) : 10,
    maxWaitBeforeBrowserClosing: process.env.MAX_WAIT_BEFORE_BROWSER_CLOSING ? parseInt(process.env.MAX_WAIT_BEFORE_BROWSER_CLOSING) : 2 * minute,
    maxPageWaitingTime: process.env.MAX_PAGE_WAITING_TIME ? parseInt(process.env.MAX_PAGE_WAITING_TIME): 2 * minute
  };

  BrowserCluster.createBrowserCluster(clusterOptions, browserConfig, browserWorkerOptions).run();
}

async function handleExit(signal: string): Promise<void> {
  console.log(`Received ${signal}. Close server properly.`)
  await BrowserCluster.getBrowserCluster().closeAllWorkers();
  server.close(() => {
    if (signal == 'SIGINT' || signal == 'SIGTERM') {
      process.exit(0);
    }
  });
}

function removeLogFile(): void {
  const logPath = path.join(__dirname, '../logfile.log');

  if (existsSync(logPath)) {
    unlinkSync(logPath);
  }
}
