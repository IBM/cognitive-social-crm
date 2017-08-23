import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { ModalDirective } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-tweet-details',
  templateUrl: './tweet-details.component.html',
  styleUrls: ['./tweet-details.component.css']
})
export class TweetDetailsComponent implements OnInit {

  @ViewChild('tweetModal') public tweetModal:ModalDirective;
  @Input() selectedTweet:any

  constructor() { }

  ngOnInit() {
  }

  getEmotionsAsArray(tweet) {
    let emotions = tweet.enrichments.nlu.emotion.document.emotion;
    let a = []
    for (let e in emotions) {
      a.push({ emotion: e, score: emotions[e] })
    }
    return a
  }

  show() {
    this.tweetModal.show()
  }
}
