import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import analysisRoutes from "./routes/AnalysisRoute";
import tweeterRoutes from "./routes/TweeterRoute";
import { errorHandler } from "./middleware/ErrorHandler";
import config from "./config";
import * as path from "path";
const CloudantInitializer = require("./setup/cloudant.initializer");
import cloudantConfig from "./data/cloudant.config";
import { TweeterListener } from "./service/TweeterListener";
import { TwitterOptions } from "./model/CRMModel";
import logger from "./util/Logger";

class App {

  constructor() {
    this.app = express();
    this.cloudantInitializer = new CloudantInitializer(config.cloudant_username, config.cloudant_password, cloudantConfig);
    this.config();
    this.routes();
    this.databaseSetup();

    const twitOptions: TwitterOptions = <TwitterOptions>{};
    twitOptions.max = 1;
    twitOptions.outputType = "json";
    this.twitterListener = TweeterListener.getInstance(twitOptions);

    /**
     * Make sure first user ids are set if LISTEN_TO flag is set.
     */
    this.twitterListener.init()
      .then(() => {
        this.twitterListenerStart();
      })
      .catch((err) => {
        logger.error(err);
      });

  }

  public app: express.Application;
  private cloudantInitializer: any;
  private twitterListener: TweeterListener;

  private config(): void {
    if (config.environment === "prod") {
      this.app.use(express.static(path.join(__dirname, "../client/dist")));
    }
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(errorHandler);
    this.app.use(cors());

  }

  private databaseSetup(): void {
    // run database setup during startup
    this.cloudantInitializer.setupCloudant();
  }

  private twitterListenerStart(): void {
    this.twitterListener.startListener();
  }

  private routes(): void {
    this.app.use("/tweets", tweeterRoutes);
    this.app.use("/analysis", analysisRoutes);

  }
}

export default new App().app;