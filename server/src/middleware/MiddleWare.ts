import { NextFunction, Request, Response } from 'express';
import * as express from 'express';
import * as path from 'path';
import { default as config, ENV } from '../config';
import logger from '../util/Logger';

export class MiddleWare {

  public static appMiddleware(app: express.Application) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (config.environment === ENV.prod) {
        app.use(express.static(path.join(__dirname, '../../../client')));
      }
      next();
    };
  }
}
