import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { DatePipe } from '@angular/common'

import { DashboardService } from '../../dashboard.service'
import { ConfigService } from '../../../shared/config.service'
import { TwitterService } from '../../../shared/twitter.service'
import { AnalysisService } from '../../../shared/analysis.service'

const MY_COMPONENT_NAME = 'status';

declare var c3:any
declare var $:any

@Component({
  selector: 'app-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.css']
})
export class StatusComponent implements OnInit {

  private componentTriggerSub:Subscription;

  // Data Binding Variables
  public receiverStatus:any
  public listenerState:string = ''
  public recentTweets:any
  public positiveTweets:number = 0
  public negativeTweets:number = 0
  public sentimentTrend:string

  public currentTrendIcon;

  public positiveTrendIcon = 'fa-thumbs-up'
  public negativeTrendIcon = 'fa-thumbs-down'

  public currentTrendInsightStyle;

  public positiveInsightStyle = 'insight-box-outline--positive'
  public negativeInsightStyle = 'insight-box-outline--negative'

  private currentReceiverStateIcon;

  private receiverInitializedIcon = 'fa-pause'
  private receiverStoppedIcon = 'fa-stop'
  private receiverStartedIcon = 'fa-play'

  constructor(private dashboardService: DashboardService, private twitter: TwitterService, private analysis: AnalysisService, private config: ConfigService) { }

  ngOnInit() {
    this.componentTriggerSub = this.dashboardService.componentTrigger.subscribe((component) => {
       if (component === MY_COMPONENT_NAME) {
         console.log('Loading Status Component')
         this.loadStatus()
         this.loadSentimentTrend()
         this.loadRecentTweets()
         this.loadTweetAllocation()
         this.loadSentimentSummary()
       }
    })
  }

  loadStatus() {
    this.twitter.listenerStatus().subscribe((status) => {
      this.receiverStatus = status
      this.listenerState = this.config.toTitleCase(status.state)
      switch (status.state) {
        case 'initialized':
          this.currentReceiverStateIcon = this.receiverInitializedIcon
          break
        case 'stopped':
          this.currentReceiverStateIcon = this.receiverStoppedIcon
          break
        case 'started':
          this.currentReceiverStateIcon = this.receiverStartedIcon
          break
        default:
          this.currentReceiverStateIcon = this.receiverInitializedIcon
      }
    })
  }

  loadRecentTweets() {
    this.analysis.listByPostDate(5, 0).subscribe((tweets) => {
      this.recentTweets = tweets.data
    })
  }

  loadSentimentSummary() {
    this.analysis.sentimentSummary().subscribe((sentiments) => {
      this.positiveTweets = sentiments.data.positive
      this.negativeTweets = sentiments.data.negative
    })
  }

  loadSentimentTrend() {
    this.analysis.sentimentTrend().subscribe((trend) => {
      this.sentimentTrend = trend.trend
      if (trend.trend == 'Positive') {
        this.currentTrendIcon = this.positiveTrendIcon
        this.currentTrendInsightStyle = this.positiveInsightStyle
      } else {
        this.currentTrendIcon = this.negativeTrendIcon
        this.currentTrendInsightStyle = this.negativeInsightStyle
      }
    })
  }

  loadTweetAllocation() {
    this.analysis.classificationSummary().subscribe((classifications) => {
      // For the allocation chart, the app will take the SERVICE classification as
      // tweets that can be answered by Watson and the rest going to an Agent.
      let allocation = {
        Watson: 0,
        Agent: 0
      }
      let i = 0
      for (let c of classifications.classification) {
        if (this.config.ALLOCATION_TO_WATSON.indexOf(c) > -1) {
          allocation.Watson = classifications.count[i]
        } else {
          allocation.Agent += classifications.count[i]
        }
        i++
      }
      let data = {
        type: 'donut',
        json: allocation
      }
      this.updateAllocationChart(data)
    })
  }

  updateAllocationChart(tweetAllocation) {
    var chart = c3.generate({
      bindto: '#tweet-allocation-chart',
      size: {
        height: 480
      },
      data: tweetAllocation,
      donut: {
        title: 'Response Assignment'
      },
      color: {
        pattern: [this.config.WATSON, this.config.AGENT]
      }
    })
  }

  getTone(tweet) {
    if (tweet.enrichments.tone.document_tone.tone_categories[0].tones.length > 0) {
      let top_score = 0
      let top_tone = 'anger'
      for (let t of tweet.enrichments.tone.document_tone.tone_categories[0].tones) {
        if (t.score > top_score) {
          top_score = t.score
          top_tone = t.tone_id
        }
      }
      return this.config.TONE_ICONS[top_tone]
    } else {
      return '<i class="fa fa-hand-o-left fa-lg" aria-hidden="true"></i>'
    }
  }

  ngOnDestroy() {
    // prevent memory leak when component is destroyed
    this.componentTriggerSub.unsubscribe();
  }

}
