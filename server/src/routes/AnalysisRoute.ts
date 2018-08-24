import * as express from "express";
import { Request, Response } from "express";
import { AnalysisService } from "../service/AnalysisService";
import logger from "../util/Logger";

export class AnalysisRoute {

    public router: express.Router = express.Router();
    private analysisService: AnalysisService;

    constructor() {
        this.routes();
        this.analysisService = new AnalysisService();
    }

    private routes(): void {
        this.router.get("/", (req: Request, res: Response) => {
            res.status(200).send({
                message: "Hello Watson!"
            });
        });

        this.router.get("/classificationSummary", (req: Request, res: Response) => {
            this.analysisService.classificationSummary((err, result) => {
                if (err) {
                    logger.log(err);
                    res.status(500).send(err);
                } else {
                    res.status(200).send(result);
                }
            });
        });

        this.router.get("/sentimentOverTime", (req: Request, res: Response) => {
            this.analysisService.sentimentOvertime((err, result) => {
                if (err) {
                    logger.log(err);
                    res.status(500).send(err);
                } else {
                    res.status(200).send(result);
                }
            });
        });

        this.router.get("/sentimentTrend", (req: Request, res: Response) => {
            this.analysisService.sentimentTrend( (err, result) => {
                if (err) {
                    logger.log(err);
                    res.status(500).send(err);
                } else {
                    res.status(200).send(result);
                }
            });
        });

        this.router.get("/sentimentSummary", (req: Request, res: Response) => {
            this.analysisService.sentimentSummary((err, result) => {
                if (err) {
                    logger.log(err);
                    res.status(500).send(err);
                } else {
                    res.status(200).send(result);
                }
            });
        });

        this.router.get("/keywordsSummary", (req: Request, res: Response) => {
            this.analysisService.keywordsSummary((err, result) => {
                if (err) {
                    logger.log(err);
                    res.status(500).send(err);
                } else {
                    res.status(200).send(result);
                }
            });
        });

        this.router.get("/emotionalToneOvertime", (req: Request, res: Response) => {
            this.analysisService.emotionalToneOvertime((err, result) => {
                if (err) {
                    logger.log(err);
                    res.status(500).send(err);
                } else {
                    res.status(200).send(result);
                }
            });
        });

        this.router.get("/listByPostDate", (req: Request, res: Response) => {
            const skip: number = <number>req.query.skip;
            const limit: number = <number>req.query.limit;
            this.analysisService.listByPostDate(skip, limit, (err, result) => {
                if (err) {
                    logger.log(err);
                    res.status(500).send(err);
                } else {
                    res.status(200).send(result);
                }
            });
        });
    }
}

export default new AnalysisRoute().router;