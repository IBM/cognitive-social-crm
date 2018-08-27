import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { AnalysisService } from '../../service/analysis.service';
import { TweetDetailsComponent } from './tweets-details/tweets-details.component';
import * as emoji from 'node-emoji';

@Component({
  selector: 'app-tweets',
  templateUrl: './tweets.component.html',
  styleUrls: ['./tweets.component.css'],
})
export class TweetsComponent implements AfterViewInit {

  @ViewChild(TweetDetailsComponent) tweetDetails: TweetDetailsComponent;

  tweets: any;
  selectedTweet: any;
  totalTweets = 0;
  currentPage = 1;

  constructor(private analysis: AnalysisService) { }

  ngAfterViewInit() {
    this.loadTweets(10, 0);
  }

  loadTweets(limit, skip) {
    this.analysis.getPostsByDate(limit, skip).subscribe((response) => {
      this.tweets = response.data;
      this.totalTweets = response.total;
    });
  }

  pageChanged(event: any): void {
    this.loadTweets(10, ((event.page - 1) * 10));
  }

  getTopEmotion(tweet) {
    const emotions = tweet.doc.enrichments.nlu.emotion.document.emotion;
    let top_score = 0;
    let top_emotion = 'unknown';
    Object.keys(emotions).forEach((key) => {
      const score = emotions[key];
      if (score > top_score) {
        top_score = score;
        top_emotion = key;
      }
    });

    return top_emotion;
  }

  selectTweet(event, i) {
    event.stopPropagation();
    this.selectedTweet = this.tweets[i];
    this.tweetDetails.show();
  }

  getEmojiIconCode(emotion: string): string {
    switch (emotion) {
    case 'sadness':
      return emoji.get('frowning');
    case 'fear':
      return emoji.get('fearful');
    case 'joy':
      return emoji.get('smile');
    case 'anger':
      return emoji.get('rage');
    case 'disgust':
      return emoji.get('nauseated_face');
    default:
      return 'unknown';
    }
  }
}
