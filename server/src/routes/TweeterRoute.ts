import * as express from 'express';
import { Request, Response } from 'express';
import { TwitterOptions } from '../model/CRMModel';
import { TweeterListener } from '../service/TweeterListener';
import { EnrichmentPipeline } from '../util/EnrichmentPipeline';

export class TweeterRoute {

  public router: express.Router = express.Router();
  private tweeterListener: TweeterListener;

  constructor(enrichmentPipeline: EnrichmentPipeline) {
    this.routes();
    const twitOptions: TwitterOptions = {} as TwitterOptions;
    this.tweeterListener = TweeterListener.getInstance(twitOptions,  enrichmentPipeline);
  }

  private routes(): void {
    this.router.get('/', (req: Request, res: Response) => {
      res.status(200).send({
        message: 'Hello Tweet!',
      });
    });

    this.router.get('/status', (req: Request, res: Response) => {
      const status = this.tweeterListener.getStatus();
      res.status(200).send({
        status,
      });
    });

  }
}
