import { NextFunction, Request, Response } from 'express';
import logger from '../util/Logger';

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  logger.error('Error: ', error);
  res.json({ error });
}
