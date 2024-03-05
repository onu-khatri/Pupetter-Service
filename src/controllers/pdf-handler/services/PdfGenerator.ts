import { Page } from "puppeteer";
import { BrowserCluster } from "../../../browser-handler/browser-cluster";
import { PageTask } from "../../../browser-handler/page-task";
import { PageOptions } from "../../../browser-handler/browser-page";
import { PdfSaverOptions } from "../validation/PdfSaverOptions";

/* The PdfGenerator class is responsible for generating PDF files from a given URL using a browser
handler. */
export class PdfGenerator {

/**
 * The constructor function initializes the logger and browserHandler properties.
 * @param {any} logger - The logger parameter is an object that is used for logging messages or errors.
 * It could be a custom logger implementation or a library like Winston or Bunyan.
 * @param {BrowserHandler} browser - The `browser` parameter is an instance of the `BrowserHandler`
 * class. It is used to handle browser-related operations such as opening a new browser window,
 * navigating to a URL, interacting with elements on a web page, etc.
 */
  constructor(private cluster: BrowserCluster) {
  }

  private htmlPageToPdf = (params: { page: Page; options: PdfSaverOptions; }): Promise<any> => params.page.pdf(params.options);

  async makePdfOutput(
    url: string,
    options: PdfSaverOptions,
    pageOptions: PageOptions
  ): Promise<Buffer> {
      const task = new PageTask<Buffer>(url, pageOptions, this.htmlPageToPdf, options)
      await this.cluster.addPageTask(task);

      return task.resultObserver;
  }
}
