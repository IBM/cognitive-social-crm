import * as express from "express";
import { Request, Response } from "express";
import { TweeterListener } from "../service/TweeterListener";
import { TwitterOptions } from "../model/CRMModel";

class TweeterRoute {

    public router: express.Router = express.Router();
    private tweeterListener: TweeterListener;

    constructor() {
        this.routes();
        const twitOptions: TwitterOptions = <TwitterOptions>{};
        twitOptions.max = 1;
        twitOptions.outputType = "json";
        this.tweeterListener = TweeterListener.getInstance(twitOptions);
    }

    private routes(): void {
        this.router.get("/", (req: Request, res: Response) => {
            res.status(200).send({
                message: "Hello Tweet!"
            });
        });

        this.router.get("/status", (req: Request, res: Response) => {
            const status = this.tweeterListener.getStatus();
            res.status(200).send({
                status
            });

        });


    }
}

export default new TweeterRoute().router;