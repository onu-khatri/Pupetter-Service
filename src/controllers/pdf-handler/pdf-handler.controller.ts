import { Request, Response, Router } from "express";
import urlParser = require("url");
import {
  PdfSaverOptions,
  mapPdfSaverOptions,
} from "./validation/PdfSaverOptions";
import { PdfGenerator } from "./services/PdfGenerator";
import { validationResult } from "express-validator";
import BaseApi from "../BaseApi";
import { ALLOWED_DOMAINS } from "../../support/constants";
import { pdfSaverOptionChecks } from "./validation/pdfSaverOptionChecks";
import { timeoutError } from "../../browser-handler/timeout-error";
import { PageOptions } from "../../browser-handler/browser-page";

export default class PdfHandlerController extends BaseApi {
  pdfGenerator: PdfGenerator

  constructor(pdfGenerator: PdfGenerator) {
    super();
    this.pdfGenerator = pdfGenerator;
  }

  public register(): Router {
    this.router.post('/save-as-pdf', pdfSaverOptionChecks, this.getPdf.bind(this));

    return this.router;
  }

  async getPdf(req: Request, res: Response): Promise<any> {
    let { url, pdfOptions, pageOptions } = req.body;

    if (!this.validateRequest(req, res)) {
      return;
    }

    this.optionsCheck(pdfOptions, pageOptions);

    try {
      const pdfBuffer = await this.pdfGenerator.makePdfOutput(url, pdfOptions, pageOptions);

      res.writeHead(200, {
        "Content-Type": "application/pdf",
      });

      res.end(pdfBuffer, "binary");
    } catch (err) {
      if(err instanceof timeoutError) {
        res.status(err.statusCode()).end(`PDF making error: ${err}`);
      } else {
        res.status(500).end(`PDF making error: ${err}`);
      }
    }

    return;
  }

  private optionsCheck(
    pdfOptions?: PdfSaverOptions,
    pageOptions?: PageOptions
  ): void {
    if (!pdfOptions || typeof pdfOptions !== "object") {
      pdfOptions = {};
    }

    if (!pageOptions || typeof pageOptions !== "object") {
      pageOptions = {} as any;
    }

    mapPdfSaverOptions(pdfOptions);
  }

  private validateRequest(req: Request, res: Response): boolean {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422).json({
        success: true,
        errors: errors,
      });
      return false;
    }

    const url = req.body.url;
    if (!this.validateUrl(url)) {
      res
        .status(422)
        .send(
          `Url should be valid and must belong to one of the following domains: ${ALLOWED_DOMAINS.join(
            ","
          )}`
        );
      return false;
    }

    return true;
  }

  private validateUrl(url: string): boolean {
    if (!url || typeof url !== "string") {
      return false;
    }

    let validUrl = false;
    const parsedUrl = new urlParser.URL(url);

    ALLOWED_DOMAINS.forEach((item: string) => {
      if (
        parsedUrl &&
        parsedUrl.hostname &&
        parsedUrl.hostname.indexOf(item) >= 0
      ) {
        validUrl = true;
      }
    });

    return validUrl;
  }
}