import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import config from './config';
import { errorHandler } from './middleware/ErrorHandler';
import { MiddleWare } from './middleware/MiddleWare';
import { AnalysisRoute } from './routes/AnalysisRoute';
import { TweeterRoute } from './routes/TweeterRoute';
import { TwitterOptions, CloudantOptions } from './model/CRMModel';
import { TweeterListener } from './service/TweeterListener';
import logger from './util/Logger';
import { ConversationInitializer } from './setup/ConversationInitializer';
import { EnrichmentPipeline } from './util/EnrichmentPipeline';
import { CloudantDAO } from './dao/CloudantDAO';

class App {

  public app!: express.Application;
  private tweeterListener!: TweeterListener;
  private conversationInitializer!: ConversationInitializer;

  private cloudantDAO!: CloudantDAO;

  constructor() {
    this.app = express();
    this.config();

    const twitOptions: TwitterOptions = {} as TwitterOptions;
    twitOptions.max = -1;

    this.conversationInitializer = new ConversationInitializer();
    // Do other setup once converstaion is setup and returns the workspace id
    this.conversationInitializer.init().then((dbWorkspaceId) => {
      twitOptions.workspaceId = dbWorkspaceId as string;

      const enrichmentPipeline: EnrichmentPipeline = EnrichmentPipeline.getInstance(dbWorkspaceId as string);
      // app level initialization
      const cloudantOptions: CloudantOptions = {} as CloudantOptions;
      cloudantOptions.maxBufferSize = config.max_buffer_size;

      this.cloudantDAO = CloudantDAO.getInstance(cloudantOptions, enrichmentPipeline);
      // setup the database once the enrichment pipeline has been initialized.
      this.cloudantDAO.setupCloudant()
        .then(() => {
          this.tweeterListener = TweeterListener.getInstance(twitOptions, enrichmentPipeline);
          // Make sure first user ids are set if LISTEN_TO flag is set.
          this.tweeterListener.init()
            .then(() => {
              this.tweeterListenerStart();
            }).catch((err) => {
              logger.error(err);
            });

          this.routes(enrichmentPipeline, this.cloudantDAO);
        }).catch((error) => {
          logger.error(error);
          process.exit(1);
        });
    }).catch((error) => {
      logger.error(error);
    });
  }

  private config(): void {
    this.app.use(MiddleWare.appMiddleware(this.app));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(errorHandler);
    this.app.use(cors());

  }

  private tweeterListenerStart(): void {
    this.tweeterListener.startListener();
  }

  private routes(enrichmentPipeline: EnrichmentPipeline, cloudantDAO: CloudantDAO): void {
    this.app.use('/tweets', new TweeterRoute(enrichmentPipeline).router);
    this.app.use('/analysis', new AnalysisRoute(cloudantDAO).router);

  }
}

export default new App().app;
