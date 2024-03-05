import { PDFOptions } from "puppeteer";

// See https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-printToPDF for details
/* The code is defining an interface called `PdfSaverOptions` that extends the `PDFOptions` interface
from the "puppeteer" library. */
export interface PdfSaverOptions extends PDFOptions {
  paperWidth?: number;
  paperHeight?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
}

/**
 * The function `mapPdfSaverOptions` maps certain properties of the `PdfSaverOptions` object to
 * different property names if they exist.
 * @param {PdfSaverOptions} options - The `options` parameter is an object that contains various
 * properties related to saving a PDF.
 * @returns `void`, which means it does not return any value.
 */
export function mapPdfSaverOptions(options: PdfSaverOptions): void {
  if(!options) {
    return;
  }

  if (options.paperWidth) {
    options.width = options.paperWidth;
  }

  if (options.paperHeight) {
    options.height = options.paperHeight;
  }

  if (!options.margin && (options.marginBottom || options.marginLeft || options.marginRight || options.marginTop))
    options.margin = {
      bottom: options.marginBottom,
      left: options.marginLeft,
      right: options.marginRight,
      top: options.marginTop
    }
}
