import { Request, Response, NextFunction } from "express";
import logger from "../util/logger";

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
    logger.error("Error: ", error);
    res.json({error: error});
}