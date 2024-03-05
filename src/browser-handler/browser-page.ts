import { random } from "lodash";
import { Browser, HTTPResponse, Page, PuppeteerLifeCycleEvent, WaitForSelectorOptions } from "puppeteer";
import { letterPortraitHeight, letterPortraitWidth } from "../support/constants";
import { LogHandler } from "../services/LogHandler";

export interface PageOptions {
  width: number,
  height: number,
  maxWaitingTime: number,
  MinimumWaitingTime: number,
  waitUntilSchema: PuppeteerLifeCycleEvent,
  emulateMedia?: 'screen' | 'print';
  waitForSelector: {
    selector: string;
    options?: WaitForSelectorOptions;
  }
}

export class BrowserPage {
  constructor(private browser: Browser) {
  }
  
  public async createPage(url: string, pageOptions: PageOptions): Promise<{page?: Page, error?: string}> {
    let page: Page | null = null;
    let exceptionMessage;
    try {
      page = await this.browser!.newPage();
      await page.setViewport({
        width: pageOptions.width ?? letterPortraitWidth,
        height: pageOptions.height ?? letterPortraitHeight,
      });

      const validTimeout = this.validMaxTimeout(pageOptions.MinimumWaitingTime || 1000*60*3, pageOptions.MinimumWaitingTime);
      page.setDefaultTimeout(validTimeout);
      await page.emulateMediaType(pageOptions.emulateMedia);

      url = `${url + (url.indexOf("?") > 0 ? "&" : "?")}randomPrefix=${random(1000)}`;

      const response = await page.goto(url, {
        waitUntil: pageOptions.waitUntilSchema || 'networkidle2',
        timeout: validTimeout,
      });

      if(pageOptions.waitForSelector?.selector) {
        await page.waitForSelector(pageOptions.waitForSelector.selector, pageOptions.waitForSelector.options)
      }

      exceptionMessage = await this.isInvalidResponse(response, page);
      if (exceptionMessage) {
        await page?.close();
      } else {
        return {page: page};
      }
    } catch (exception) {
      const logger = LogHandler.getLogHandler().globalLogger;
      logger.error(exception);
      exceptionMessage = String(exception);
      page?.close();
    }
    
    return {error: exceptionMessage};
  }

  private async isInvalidResponse(
    response: HTTPResponse | null,
    page: Page
  ): Promise<string> {
    const status = response?.status() || 0;
    if (status != 200) {
      return `Page: ${page.url()} return status ${status}`;
    }

    return "";
  }
  
  private validMaxTimeout(minimumWaitingTime: number, timeout?: number ): number {
    if (
      timeout == undefined ||
      (timeout != 0 && timeout < minimumWaitingTime)
    ) {
      timeout = minimumWaitingTime;
    }

    return timeout;
  }
} 