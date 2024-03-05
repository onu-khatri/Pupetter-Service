import { NextFunction, Request, Response, Router } from 'express';
import * as os from 'os';
import * as process from 'process';
import fs from 'fs';
import BaseApi from '../BaseApi';
import {
  IServerTimeResponse,
  IResourceUsageResponse,
  IProcessInfoResponse,
} from './system-status.types';
import path from 'path';
import { createReadStream } from 'fs';
const serverPkg = require('../../../../package.json');

export default class SystemStatusController extends BaseApi {
  constructor() {
    super();
  }

  public register(): Router {
    this.router.get('/system', this.getSystemInfo.bind(this));
    this.router.get('/time', this.getServerTime.bind(this));
    this.router.get('/usage', this.getResourceUsage.bind(this));
    this.router.get('/process', this.getProcessInfo.bind(this));
    this.router.get('/logfile', this.logFile.bind(this));
    this.router.delete('/logfile', this.deleteLogFile.bind(this));
    
    return this.router;
  }

  public static healthCheck(req: Request, res: Response) {
    res.status(200).end(`version: ${serverPkg.version}`);
  }

  public logFile(req: Request, res: Response, next: NextFunction) {
    try {
      const logPath = path.join(__dirname, "../../../../logfile.log");
      if (fs.existsSync(logPath)) {
        const readStream = createReadStream(logPath);
        res.writeHead(200, {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename=log.txt`,
        });

        readStream.pipe(res);
      } else {
        res.status(200).json("{status: 'no log file exists'}");
      }

    } catch (exception) {
      next(exception);
    }

  }

  public deleteLogFile(req: Request, res: Response, next: NextFunction) {
    try {
      const logPath = path.join(__dirname, "../../../../logfile.log");
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
        res.status(200).json("{status: 'file deleted!!'}");
      } else {
        res.status(200).json("{status: 'no log file exists'}");
      }

    } catch (exception) {
      next(exception);
    }
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   */
  public getSystemInfo(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    try {
      const response = {
        cpus: os.cpus(),
        network: os.networkInterfaces(),
        os: {
          platform: process.platform,
          version: os.release(),
          totalMemory: os.totalmem(),
          uptime: os.uptime(),
        },
        currentUser: os.userInfo(),
      };
      // call base class method
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   */
  public getServerTime(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    try {
      const now: Date = new Date();
      const utc: Date = new Date(
        now.getTime() + now.getTimezoneOffset() * 60000,
      );
      const time: IServerTimeResponse = {
        utc,
        date: now,
      };
      res.status(200).send(time);
    } catch (error) {
      next(error);
    }
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   */
  public getResourceUsage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    try {
      const totalMem: number = os.totalmem();
      const memProc: NodeJS.MemoryUsage = process.memoryUsage();
      const freemMem: number = os.freemem();

      const response: IResourceUsageResponse = {
        processMemory: memProc,
        systemMemory: {
          free: freemMem,
          total: totalMem,
          percentFree: Math.round((freemMem / totalMem) * 100),
        },
        processCpu: process.cpuUsage(),
        systemCpu: os.cpus(),
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   */
  public getProcessInfo(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    try {
      const response: IProcessInfoResponse = {
        procCpu: process.cpuUsage(),
        memUsage: process.memoryUsage(),
        env: process.env,
        pid: process.pid,
        uptime: process.uptime(),
        applicationVersion: process.version,
        nodeDependencyVersions: process.versions,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}