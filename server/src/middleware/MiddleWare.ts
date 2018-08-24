import { Request, Response, NextFunction } from "express";
import * as express from "express";

export class MiddleWare {

    constructor() {

    }

    appMiddleware(app: express.Application) {
        return (req: Request, res: Response, next: NextFunction) => {
            next();
        };
    }
}

