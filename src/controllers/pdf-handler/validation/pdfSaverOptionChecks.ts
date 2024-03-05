import { check } from "express-validator";


/* The code is defining an array called `pdfSaverOptionChecks` which contains a list of validation
checks for different properties of req.body.options. These checks are used to validate the input data
before saving it as a PDF. */
export const pdfSaverOptionChecks = [
  check('url').isURL({ require_valid_protocol: true, allow_protocol_relative_urls: false, require_tld: true }),
  check('options.html').optional(),
  check('options.scale').custom((value, { req }) => {
    if (!value) {
      return true;
    }
    if (Number.isNaN(value) || value < 0.1 || value > 2) {
      throw new Error("scale must be between 0.1 and 2");
    }

    return true;
  }),
  check('options.displayHeaderFooter').isBoolean().optional(),
  check('options.headerTemplate').optional(),
  check('options.footerTemplate').optional(),
  check('options.printBackground').isBoolean().optional(),
  check('options.landscape').isBoolean().optional(),
  check('options.pageRanges').custom((value, { req }) => {
    if (!value) {
      return true; // optional
    }

    const pageRanges = value.split('-');
    if (Number.isNaN(pageRanges[0]) || Number.isNaN(pageRanges[1])) {
      throw new Error("Invalid page range. Must be like 2-5");
    }

    return true;
  }),
  check('options.format').custom((value, { req }) => {
    if (!value) {
      return true;
    }

    const options = ['Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'];

    if (options.indexOf(value) === -1) {
      throw new Error(`format must be one of ${options.join(',')}`);
    }

    return true;
  }),
  check('options.width').isNumeric().optional(),
  check('options.height').isNumeric().optional(),
  check('options.paperWidth').isNumeric().optional(),
  check('options.paperHeight').isNumeric().optional(),
  check('options.marginTop').isNumeric().optional(),
  check('options.marginBottom').isNumeric().optional(),
  check('options.marginLeft').isNumeric().optional(),
  check('options.marginRight').isNumeric().optional(),
  check('options.margin.top').isNumeric().optional(),
  check('options.margin.right').isNumeric().optional(),
  check('options.margin.bottom').isNumeric().optional(),
  check('options.margin.left').isNumeric().optional(),
  check('options.preferCSSPageSize').isBoolean().optional()
];
