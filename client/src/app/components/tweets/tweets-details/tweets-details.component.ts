import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { ModalDirective } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-tweet-details',
  templateUrl: './tweets-details.component.html',
  styleUrls: ['./tweets-details.component.css'],
})
export class TweetDetailsComponent implements OnInit {

  @ViewChild('tweetModal') public tweetModal: ModalDirective;
  @Input() selectedTweet: any;

  constructor() { }

  ngOnInit() {
  }

  getEmotionsAsArray(tweet) {
    const emotions = tweet.doc.enrichments.nlu.emotion.document.emotion;
    const a = [];
    for (const e of emotions) {
      a.push({ emotion: e, score: emotions[e] });
    }
    return;
  }

  show() {
    this.tweetModal.show();
  }
}
