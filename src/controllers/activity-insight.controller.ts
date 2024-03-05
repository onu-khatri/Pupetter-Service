import { Request, Response, Router } from "express";
import puppeteer, { Browser } from "puppeteer";
import { LogHandler } from "../services/LogHandler";
import { BrowserCluster } from "../browser-handler/browser-cluster";
import { BrowserStatus } from "../browser-handler/browser-worker";
import BaseApi from "./BaseApi";


const puppeteerExecutablePath = () => puppeteer.executablePath();

export default class ActivityInsightController extends BaseApi {
  constructor() {
    super();
  }

  public register(): Router {
    this.router.get('/activity-check', this.activityCheck.bind(this));
    
    return this.router;
  }

  async activityCheck(req: Request, res: Response) {
    try {
      var query = req.query as any;
      const handler = BrowserCluster.getBrowserCluster();
      const browsers = handler.allWorkers.toArray();
      const pageTasksInWaiting = handler.waitingTasks;
      const allBrowserDetails = await Promise.all(
        browsers.map(async (browserInfo) => {
          const browser = browserInfo.browser;
          return {
            status: BrowserStatus[browserInfo.browserStatus],
            lastActionOn: browserInfo.lastWorkTime,
            pageCountInInfo: browserInfo.currentWorkingPages,
            detail: await this.getBrowserData(browser)
          }
        })
      );
  
      const pagesInWait = {
        count: pageTasksInWaiting.size,
        detail: pageTasksInWaiting.toArray().map(task => ({
          url: task.url,
          secondsToExpire: Math.floor(((new Date(task.expirationTime) as any) - (new Date() as any)) / 1000)
        }))
      }
  
      const BrowserInfo = {
        maxIdleTimeoutInMinutes: handler.browserOptions.maxIdleTimeOfBrowser,
        maxPageAllowedPerBrowser: handler.browserOptions.maxParallelTasks,
        executablePath: handler.puppeteerLaunchOptions.executablePath,
        puppeteerExecutablePath: puppeteerExecutablePath(),
        browserOptions: handler.browserOptions,
        clusterOptions: handler.browserClusterOptions,
        puppeteerOptions: handler.puppeteerLaunchOptions,
        Browsers: allBrowserDetails,
        pagesInWait      
      } as any;
  
      const browser = browsers.length > 1 ? browsers[0].browser : null;
  
      if (browser && (query && query.versionCheck)) {
        BrowserInfo.version = await browser.version();
        BrowserInfo.agent = await browser.userAgent();
      }
  
      res.status(200).json(BrowserInfo);
    } catch (exception) {
      const logger = LogHandler.getLogHandler().globalLogger;
      logger.error(exception);
      res.status(500).end(JSON.stringify({ error: exception }));
    }
  }
  
  async cleanBrowsers(_: Request, res: Response) {
    const handler = BrowserCluster.getBrowserCluster();
    try {
      await handler.closeAllWorkers();
      res.status(200).end(JSON.stringify({ status: 'done' }));
    } catch (exception) {
      const logger = LogHandler.getLogHandler().globalLogger;
      logger.error(exception);
      res.status(500).end(JSON.stringify({ error: exception }));
    }
  }
  
  async getBrowserData(browser: Browser): Promise<any> {
    if(!browser) {
      return;
    }
    
    const pages = await browser.pages();
    const targets = browser.targets();
  
    return {
      wsEndpoint: browser.wsEndpoint(),
      pid: browser.process()?.pid,
      target_count: targets?.length,
      page_count: pages?.length,
      pages: pages?.map((page) => ({
        url: page.url(),
        isClosed: page.isClosed,
        defaultTimeout: page.getDefaultTimeout(),
      }))
    };
  }  
}