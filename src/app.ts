import express from 'express';
import https from 'https';
import fs from 'fs';
import addErrorHandler from './middleware/error-handler';
import registerRoutes from './routes';
import bodyParser from 'body-parser';

export default class App {
  public express: any; // express.Application;
	// public httpsServer: https.Server;

  public async init(): Promise<void> {
		this.express = express();
		// this.httpsServer = https.createServer(this.express);

    this.express.use(bodyParser.json());

		// // register the all routes
		this.routes();

		// add the middleware to handle error, make sure to add if after registering routes method
		this.express.use(addErrorHandler);

	}

  private httpsOptions = () => ({
    // key: fs.readFileSync('key.pem', 'utf8'),
    // cert: fs.readFileSync('cert.pem', 'utf8')
  });

  private routes(): void {
		this.express.use('/', registerRoutes());
	}

}
