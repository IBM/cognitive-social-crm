import { NextFunction, Request, Response } from 'express';
import * as express from 'express';

export class MiddleWare {

  public appMiddleware(app: express.Application) {
    return (req: Request, res: Response, next: NextFunction) => {
      next();
    };
  }
}
