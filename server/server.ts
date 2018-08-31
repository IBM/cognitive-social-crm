import app from './src';
import config from './src/config';
import logger from './src/util/Logger';

const server = app.listen(config.port, () => {
  logger.log(
    'App is running at http://localhost:%s in %s mode',
    config.port,
    config.environment,
  );
  logger.log('  Press CTRL-C to stop\n');
});

export default server;
