import { Request, Response, Router } from "express";import BaseApi from "./BaseApi";
import { BrowserCluster } from "../browser-handler/browser-cluster";
import { LogHandler } from "../services/LogHandler";

export default class BrowserController extends BaseApi {
  constructor() {
    super();
  }

  public register(): Router {
    this.router.get('/clean-browsers', this.cleanBrowsers.bind(this));

    return this.router;
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
}