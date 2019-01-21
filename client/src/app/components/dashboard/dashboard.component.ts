import { Component, OnInit } from '@angular/core';
import { Chart } from 'chart.js';
import { AnalysisService } from '../../service/analysis.service';
import { Observable, Subscription, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { UIConfiguration } from '../../constant/UIConfiguration';
import { CloudData, CloudOptions } from 'angular-tag-cloud-module';
import { TweeterService } from '../../service/tweeter.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {

  // Data Binding Variables
  public receiverStatus: any;
  public listenerState: string;
  public recentTweets: any;
  public positiveTweets: number;
  public negativeTweets: number;
  public sentimentTrend: string;

  public currentTrendIcon;

  public positiveTrendIcon = '<i class="far fa-thumbs-up"></i>';
  public negativeTrendIcon = '<i class="far fa-thumbs-down"></i>';

  public currentTrendInsightStyle;

  public positiveInsightStyle = 'insight-box--positive';
  public negativeInsightStyle = 'insight-box--negative';
  public responseAssignmentChart: Chart;
  public classificationSummaryBarChart: Chart;
  public sentimentOverTimeLineChart: Chart;
  public emotionalToneOverTimeChart: Chart;
  public keywordCloud: CloudData[] = [
    { text: 'Initialiazing keywords', weight: 4 },
  ];
  public options: CloudOptions;

  constructor(private analysisService: AnalysisService,
              private tweeterService: TweeterService,
              private uiConfiguration: UIConfiguration) { }

  ngOnInit() {

    this.options = {
      width: 1,
      height: 450,
      overflow: false,
    };

    this.loadKeywordSummary();
    this.loadTweetAllocation();
    this.loadRecentTweets();
    this.loadSentimentSummary();
    this.loadSentimentTrend();
    this.sleep(2000).then(() => {
      this.loadClassificationSummary();
      this.loadSentimentOverTime();
      this.loadEmotionalToneOvertime();
    });
    this.loadStatus();
  }

  sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  loadStatus() {
    this.tweeterService.listenerStatus().subscribe((status) => {
      this.receiverStatus = status.status;
      this.listenerState = this.uiConfiguration.toTitleCase(status.status.state);
    });
  }

  loadRecentTweets() {
    this.analysisService.getPostsByDate(5, 0).subscribe((tweets) => {
      this.recentTweets = tweets.data;
    });
  }

  loadSentimentSummary() {
    this.analysisService.getSentimentSummary().subscribe((sentiments) => {
      this.positiveTweets = sentiments.positive == null ? 0 : sentiments.positive;
      this.negativeTweets = sentiments.negative == null ? 0 : sentiments.negative;
    });
  }

  loadSentimentTrend() {
    this.analysisService.getSentimentTrend().subscribe((trend) => {
      const tweets = trend.rows;
      const response = {
        trend: '',
      };
      let positive = 0;
      let negative = 0;
      for (const tweet of tweets) {
        const tone: string = tweet.doc.enrichments.nlu.sentiment.document.label;
        if (tone === 'positive' || tone === 'neutral') {
          positive++;
        } else {
          negative++;
        }
      }
      if (positive > negative) {
        response.trend = 'Positive';
      } else {
        response.trend = 'Negative';
      }

      this.sentimentTrend = response.trend;
      if (response.trend === 'Positive') {
        this.currentTrendIcon = this.positiveTrendIcon;
        this.currentTrendInsightStyle = this.positiveInsightStyle;
      } else {
        this.currentTrendIcon = this.negativeTrendIcon;
        this.currentTrendInsightStyle = this.negativeInsightStyle;
      }
    });
  }

  loadTweetAllocation() {
    this.analysisService.getClassificatonSummary().subscribe((classifications) => {
      const allocation = {
        Watson: 0,
        Agent: 0,
      };
      let i = 0;
      for (const c of classifications) {
        if (this.uiConfiguration.ALLOCATION_TO_WATSON.indexOf(c.key) > -1) {
          allocation.Watson = c.value;
        } else {
          allocation.Agent += c.value;
        }
        i++;
      }
      this.updateAllocationChart(allocation);
    });
  }

  updateAllocationChart(tweetAllocation) {
    this.responseAssignmentChart = new Chart('responseAssignmentChart', {
      type: 'doughnut',
      data: {
        labels: [this.uiConfiguration.WATSON_LABEL, this.uiConfiguration.AGENT_LABEL],
        datasets: [
          {
            label: 'Response Assignment',
            backgroundColor: ['#3e95cd', '#8e5ea2'],
            data: [tweetAllocation.Watson, tweetAllocation.Agent],
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: 'Tweets Response Assignment',
        },
      },
    });

  }

  loadClassificationSummary() {
    this.analysisService.getClassificatonSummary().subscribe((classifications) => {
      const x = [];
      const y = [];
      for (const cn of classifications) {
        x.push(cn.key);
        y.push(cn.value);
      }
      this.updateClassificationChart(x, y);
    });
  }

  loadSentimentOverTime() {
    this.analysisService.getSentimentOverTime().subscribe((sentiments) => {
      this.updateSentimentOvertimeChart(sentiments);
    });
  }

  updateClassificationChart(x, y) {
    this.classificationSummaryBarChart = new Chart('classificationSummaryBarChart', {
      type: 'bar',
      data: {
        labels: x,
        datasets: [
          {
            label: 'Tweets',
            backgroundColor: ['#3e95cd', '#8e5ea2', '#3cba9f', '#e8c3b9', '#c45850'],
            data: y,
          },
        ],
      },
      options: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Live Tweets Classification',
        },
      },
    });
  }

  updateSentimentOvertimeChart(sentiments) {

    this.sentimentOverTimeLineChart = new Chart('sentimentOverTimeLineChart', {
      type: 'line',
      data: {
        labels: sentiments.date,
        datasets: [{
          data: sentiments.positive,
          label: 'Positive',
          borderColor: '#3e95cd',
          fill: false,
        }, {
          data: sentiments.neutral,
          label: 'Neutral',
          borderColor: '#8e5ea2',
          fill: false,
        }, {
          data: sentiments.negative,
          label: 'Negative',
          borderColor: '#3cba9f',
          fill: false,
        },
        ],
      },
      options: {
        title: {
          display: true,
          text: 'Sentiment over time',
        },
      },
    });
  }

  getTone(tweet) {
    const toneCategories = tweet.doc.enrichments.tone.document_tone.tones;
    if (toneCategories.length > 0) {
      let top_score = 0;
      let top_tone = 'anger';
      for (const t of toneCategories) {
        if (t.score > top_score && this.uiConfiguration.TONE.includes(t.tone_id)) {
          top_score = t.score;
          top_tone = t.tone_id;
        }
      }
      return this.uiConfiguration.TONE_ICONS[top_tone];
    } else {
      return 'unknown';
    }
  }

  loadEmotionalToneOvertime() {
    this.analysisService.getEmotionalToneOverTime().subscribe((emotions) => {
      this.updateEmotionalToneOvertimeChart(emotions);
    });
  }

  loadKeywordSummary() {
    const changedData$: Observable<CloudData[]> = of(this.keywordCloud);
    changedData$.subscribe((res) => this.keywordCloud = res);
    this.analysisService.getKeywordsSummary().pipe(map((res) => {
      const keywordsForCloud = [];
      for (const k of res.data) {
        keywordsForCloud.push({ text: k.key, weight: k.value });
      }
      return keywordsForCloud;
    })).subscribe((keywords) => {
      this.keywordCloud = keywords;
    });
  }

  updateEmotionalToneOvertimeChart(sentiments) {
    this.emotionalToneOverTimeChart = new Chart('emotionalToneOverTimeChart', {
      type: 'line',
      data: {
        labels: sentiments.date,
        datasets: [{
          data: sentiments.anger,
          label: 'Anger',
          borderColor: '#DC3545',
          fill: false,
        }, {
          data: sentiments.fear,
          label: 'Fear',
          borderColor: '#000000',
          fill: false,
        }, {
          data: sentiments.joy,
          label: 'Joy',
          borderColor: '#3cba9f',
          fill: false,
        }, {
          data: sentiments.sadness,
          label: 'Sadness',
          borderColor: '#3e95cd',
          fill: false,
        },
        ],
      },
      options: {
        title: {
          display: true,
          text: 'Emotional tone over time',
        },
      },
    });
  }
}
