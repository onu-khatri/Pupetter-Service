import { Router } from 'express';
import { LogHandler } from './services/LogHandler';
import ActivityInsightController from './controllers/activity-insight.controller';
import { BrowserCluster } from './browser-handler/browser-cluster';
import BrowserController from './controllers/browser.controller';
import SystemStatusController from './controllers/system-status/system-status.controller';
import { PdfGenerator } from './controllers/pdf-handler/services/PdfGenerator';
import PdfHandlerController from './controllers/pdf-handler/pdf-handler.controller';

/**
 * Here, you can register routes by instantiating the controller.
 *
 */
export default function registerRoutes(): Router {
	const router = Router();

	// System Status Controller
	const systemStatusController: SystemStatusController =
		new SystemStatusController();
	router.use('/api/status', systemStatusController.register());
  router.get('/healthcheck', SystemStatusController.healthCheck);
  
  const logger = LogHandler.getLogHandler().globalLogger;
  const activityInsightController: ActivityInsightController = new ActivityInsightController();
  const browserController: BrowserController = new BrowserController();
  const pdfGenerator = new PdfGenerator(BrowserCluster.getBrowserCluster());
  const pdfHandlerController = new PdfHandlerController(pdfGenerator);

  router.use('', pdfHandlerController.register())
  router.get('', activityInsightController.register()); 
  router.get('', browserController.register());
  
	return router;
}