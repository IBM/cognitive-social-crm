import { Component, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common'

import { AnalysisService } from '../../shared/analysis.service'
import { TweetDetailsComponent } from './tweet-details/tweet-details.component'

@Component({
  selector: 'app-tweets-view',
  templateUrl: './tweets-view.component.html',
  styleUrls: ['./tweets-view.component.css']
})
export class TweetsViewComponent implements OnInit {

  @ViewChild(TweetDetailsComponent) tweetDetails:TweetDetailsComponent

  tweets:any
  selectedTweet:any
  totalTweets:number = 0
  currentPage:number = 1

  constructor(private analysis: AnalysisService) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    // Load the first 10 tweets
    this.loadTweets(10, 0)
  }

  loadTweets(limit, skip) {
    this.analysis.listByPostDate(limit, skip).subscribe((success) => {
      console.log(success)
      this.tweets = success.data
      this.totalTweets = success.total
    })
  }

  pageChanged(event:any):void {
    this.loadTweets(10, ((event.page - 1) * 10))
  }

  getTopEmotion(tweet) {
    let emotions = tweet.enrichments.nlu.emotion.document.emotion;
    let top_score = 0
    let top_emotion = 'unknown'
    for (let e in emotions) {
      let score = emotions[e]
      if (score > top_score) {
        top_score = score
        top_emotion = e
      }
    }
    return top_emotion
  }

  deleteTweet(event, id) {
    event.stopPropagation()
    this.analysis.destroyTweet(id).subscribe((success) => {
      this.loadTweets(10, 0)
    })
  }

  selectTweet(event, i) {
    event.stopPropagation()
    this.selectedTweet = this.tweets[i]
    this.tweetDetails.show()
  }
}
