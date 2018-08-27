import { Promise } from 'es6-promise';
import * as moment from 'moment';

export class OutputFormatter {

  public formatAsJson(tweet: any) {
    return new Promise((resolve, reject) => {
      if (!tweet) {
        return reject('Why are you sending me null tweets???');
      }
      // Format of date is 'Tue Jun 06 20:19:12 +0000 2017'
      const dt = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY');
      const outJson = {
        source: 'twitter',
        tweet_id: tweet.id,
        post_by: tweet.user.screen_name,
        post_date: dt.toISOString(),
        text: this.cleanText(tweet.text),
        retweet_count: tweet.retweet_count,
        retweet_from: tweet.retweeted_status ? tweet.retweeted_status.user.screen_name : '',
        coordinates: tweet.coordinates,
      };
      resolve(outJson);
    });
  }

  public cleanText(text: string) {
    let cleaned = text.replace(/\t/g, '').replace(/\n/g, '').replace(/\r/g, ' ').trim();
    // Also remove all special chars from the text and only leave ASCII behind
    cleaned = cleaned.replace(/[^\x00-\x7F]/g, '');
    return cleaned;
  }
}
