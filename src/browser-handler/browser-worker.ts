import EventEmitter from 'events';
import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from 'puppeteer';
import { BrowserPage, PageOptions } from './browser-page';
import { PageTask } from './page-task';
import { stat } from 'fs';

export interface browserWorkerOptions {
  maxParallelTasks: number,
  maxLifeSpanOfBrowser: number,
  maxIdleTimeOfBrowser: number,
  maxWaitBeforeBrowserClosing: number;
  maxPageWaitingTime: number;
}

export enum BrowserStatus {
  INIT,
  PENDING,
  IDLE,
  ACTIVE_PAGE_OPEN,
  ACTIVE_PAGE_CLOSE,
  BUSY,
  CLOSING,
  UNLINK
}

export class BrowserWorker extends EventEmitter {
  static readonly StatusUpdated = 'BrowerWorkerStatusUpdated';
  static readonly ErrorEvent = "BrowerWorkerError";

  id: string;
  isProcessingDone = false;
  browserStatus = BrowserStatus.PENDING;
  createTime: number;
  lastWorkTime: number;
  browser: Browser;
  currentWorkingPages = 0;
  removeAllListenersTimeout: NodeJS.Timeout;

  private pageTaskDoneCheckInterval: NodeJS.Timeout


  constructor(private puppeteerLaunchOptions: PuppeteerLaunchOptions, private browserOptions: browserWorkerOptions) {
    super();
    this.id = (new Date()).getTime().toString(36) + Math.random().toString(36).slice(2);
  }

  public async launchBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch(this.puppeteerLaunchOptions);
      this.createTime = Date.now();
      this.updateBrowserStatus(BrowserStatus.IDLE);
      console.log("Browser-Launch....");
    } catch (exception) {
      this.emit(BrowserWorker.ErrorEvent, exception);
      this.updateBrowserStatus(BrowserStatus.UNLINK);
    }
  }

  public async requestPageAction<T>(pageTask: PageTask<T>): Promise<any> {
    if (this.currentWorkingPages >= this.browserOptions.maxParallelTasks || this.browserStatus == BrowserStatus.CLOSING) {
      return false;
    }

    if (pageTask.hasFinished || pageTask.hasStarted) {
      return;
    }

    this.lastWorkTime = Date.now();

    pageTask.start();
    this.currentWorkingPages++;
    this.UpdateBrowserStatusOnPageEvent();

    const pageData = await (new BrowserPage(this.browser)).createPage(pageTask.url, pageTask.pageOptions);

    if (pageData.page == undefined) {
      this.currentWorkingPages--;
      this.UpdateBrowserStatusOnPageEvent(true);
      pageTask.reject(pageData.error)
      return pageData.error;
    }

    try {
      let result = await pageTask.taskAction({ page: pageData.page, options: pageTask.taskOptions });
      pageData.page.close();
      pageTask.resolve(result);
      return result;
    } catch (exception) {
      console.log(exception)
      pageData.page.close();
      pageTask.reject(exception)
    } finally {
      this.currentWorkingPages--;
      this.UpdateBrowserStatusOnPageEvent(true);
    }

    return undefined;
  }

  private UpdateBrowserStatusOnPageEvent(isPageClose = false) {
    if (this.currentWorkingPages == this.browserOptions.maxParallelTasks) {
      this.updateBrowserStatus(BrowserStatus.BUSY);
    } else {
      this.updateBrowserStatus(isPageClose ? BrowserStatus.ACTIVE_PAGE_CLOSE: BrowserStatus.ACTIVE_PAGE_OPEN);
    }
  }

  private updateBrowserStatus(status: BrowserStatus): boolean {
    if (status == BrowserStatus.ACTIVE_PAGE_CLOSE || BrowserStatus.ACTIVE_PAGE_OPEN || status == BrowserStatus.BUSY) {
      this.lastWorkTime = Date.now();
    }

    if (this.browserStatus == BrowserStatus.CLOSING && status !== BrowserStatus.UNLINK) {
      return false;
    }

    if (status != this.browserStatus || status == BrowserStatus.ACTIVE_PAGE_CLOSE) {
      const PreviousStatus = this.browserStatus;
      this.browserStatus = status;
      this.emit(BrowserWorker.StatusUpdated, PreviousStatus, this.browserStatus);
    }

    return true;
  }

  public async close() {
    if (this.browserStatus == BrowserStatus.CLOSING) {
      return;
    }

    this.updateBrowserStatus(BrowserStatus.CLOSING);
    await this.ensureAllPageClosing();
    await this.browser?.close();
    this.updateBrowserStatus(BrowserStatus.UNLINK);
    this.removeListeners().then(() => {
      clearTimeout(this.removeAllListenersTimeout);
    });
  }

  private removeListeners(): Promise<boolean> {
    return new Promise((resolve, _) => {
      this.removeAllListenersTimeout = setTimeout(() => {
        this.removeAllListeners();
        resolve(true);
      }, 200).unref();
    })
  }

  private ensureAllPageClosing(): Promise<boolean> {
    return new Promise((resolve, _) => {
      if (this.currentWorkingPages == 0) {
        resolve(true);
      } else {
        this.pageTaskDoneCheckInterval = setInterval(() => {
          if (this.currentWorkingPages == 0) {
            clearInterval(this.pageTaskDoneCheckInterval);
            resolve(true);
          }
        }, (this.browserOptions.maxWaitBeforeBrowserClosing  || 1000*30)).unref();
      }
    })
  }
}