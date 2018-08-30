import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import * as path from 'path';
import config from './config';
import { errorHandler } from './middleware/ErrorHandler';
import { AnalysisRoute } from './routes/AnalysisRoute';
import { TweeterRoute } from './routes/TweeterRoute';
import CloudantInitializer = require('./setup/cloudant.initializer');
import cloudantConfig from './data/cloudant.config';
import { TwitterOptions } from './model/CRMModel';
import { TweeterListener } from './service/TweeterListener';
import logger from './util/Logger';
import { ConversationInitializer } from './setup/ConversationInitializer';
import { EnrichmentPipeline } from './util/EnrichmentPipeline';

class App {

  public app!: express.Application;
  private cloudantInitializer!: CloudantInitializer;
  private tweeterListener!: TweeterListener;
  private conversationInitializer!: ConversationInitializer;

  constructor() {
    this.app = express();
    this.config();


    const twitOptions: TwitterOptions = {} as TwitterOptions;
    twitOptions.max = 1;

    this.conversationInitializer = new ConversationInitializer();
    //Do other setup once converstaion is setup and returns the workspace id
    let workspaceId: string = '';
    this.conversationInitializer.init().then((dbWorkspaceId) => {
      twitOptions.workspaceId = <string>dbWorkspaceId;
      this.tweeterListener = TweeterListener.getInstance(twitOptions);
      // Make sure first user ids are set if LISTEN_TO flag is set.
      this.tweeterListener.init()
        .then(() => {
          this.tweeterListenerStart();
        }).catch((err) => {
          logger.error(err);
        });

        // app level initialization    
        this.cloudantInitializer = new CloudantInitializer(
          config.cloudant_username,
          config.cloudant_password,
          config.cloudant_db,
          cloudantConfig,
          this.tweeterListener
        );

        EnrichmentPipeline.getInstance(workspaceId);
        // setup the database once the enrichment pipeline has been initialized.
        this.databaseSetup();

      this.routes();

    }).catch((error) => {
      logger.error('Error: ' + error);
    });
  }

  private config(): void {
    // if (config.environment === 'prod') {
    //   this.app.use(express.static(path.join(__dirname, '../../client/dist')));
    // }
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(errorHandler);
    this.app.use(cors());

  }

  private databaseSetup(): void {
    // run database setup during startup
    this.cloudantInitializer.setupCloudant();
  }

  private tweeterListenerStart(): void {
    this.tweeterListener.startListener();
  }

  private routes(): void {
    this.app.use('/tweets', new TweeterRoute().router);
    this.app.use('/analysis', new AnalysisRoute().router);

  }
}

export default new App().app;
