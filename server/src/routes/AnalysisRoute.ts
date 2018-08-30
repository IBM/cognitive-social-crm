import * as express from 'express';
import { Request, Response } from 'express';
import logger from '../util/Logger';
import { CloudantDAO } from '../dao/CloudantDAO';

export class AnalysisRoute {

  public router: express.Router = express.Router();
  private cloudantDAO: CloudantDAO;

  constructor(cloudantDAO: CloudantDAO) {
    this.routes();
    this.cloudantDAO = cloudantDAO;
  }

  private routes(): void {
    this.router.get('/', (req: Request, res: Response) => {
      res.status(200).send({
        message: 'Hello Watson!',
      });
    });

    this.router.get('/classificationSummary', (req: Request, res: Response) => {
      this.cloudantDAO.classificationSummary((err, result) => {
        if (err) {
          logger.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send(result);
        }
      });
    });

    this.router.get('/sentimentOverTime', (req: Request, res: Response) => {
      this.cloudantDAO.sentimentOvertime((err, result) => {
        if (err) {
          logger.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send(result);
        }
      });
    });

    this.router.get('/sentimentTrend', (req: Request, res: Response) => {
      this.cloudantDAO.sentimentTrend((err, result) => {
        if (err) {
          logger.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send(result);
        }
      });
    });

    this.router.get('/sentimentSummary', (req: Request, res: Response) => {
      this.cloudantDAO.sentimentSummary((err, result) => {
        if (err) {
          logger.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send(result);
        }
      });
    });

    this.router.get('/keywordsSummary', (req: Request, res: Response) => {
      this.cloudantDAO.keywordsSummary((err, result) => {
        if (err) {
          logger.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send(result);
        }
      });
    });

    this.router.get('/emotionalToneOvertime', (req: Request, res: Response) => {
      this.cloudantDAO.emotionalToneOvertime((err, result) => {
        if (err) {
          logger.log(err);
          res.status(500).send(err);
        } else {
          res.status(200).send(result);
        }
      });
    });

    this.router.get('/listByPostDate', (req: Request, res: Response) => {
      const skip: number = req.query.skip as number;
      const limit: number = req.query.limit as number;
      this.cloudantDAO.listByPostDate(skip, limit, (err, result) => {
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
