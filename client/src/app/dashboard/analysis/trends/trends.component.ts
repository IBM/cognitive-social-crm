import { Component, OnInit } from '@angular/core';

import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';

import { CloudData, CloudOptions } from 'angular-tag-cloud-module';

import { ConfigService } from '../../../shared/config.service'
import { DashboardService } from '../../dashboard.service'
import { AnalysisService } from '../../../shared/analysis.service'

const MY_COMPONENT_NAME = 'trends';

declare var c3:any

@Component({
  selector: 'app-trends',
  templateUrl: './trends.component.html',
  styleUrls: ['./trends.component.css']
})
export class TrendsComponent implements OnInit {

  private componentTriggerSub:Subscription;

  options: CloudOptions = {
    // if width is between 0 and 1 it will be set to the size of the upper element multiplied by the value
    width : 1,
    height : 480,
    overflow: false,
  }

  keywordCloud: Array<CloudData> = []

  constructor(private dashboardService: DashboardService, private analysis: AnalysisService, private config: ConfigService) { }

  ngOnInit() {
    this.componentTriggerSub = this.dashboardService.componentTrigger.subscribe((component) => {
      if (component === MY_COMPONENT_NAME) {
        console.log('Loading Trends Component')
        this.loadEmotionalToneOvertime()
        this.loadKeywordSummary()
      }
    })
  }

  loadEmotionalToneOvertime() {
    let component = this
    this.analysis.emotionalToneOvertime().subscribe((sentiments) => {
      let data = {
        xFormat: '%_m-%_d-%Y',
        type: 'spline',
        x: 'dates',
        json: sentiments,
        colors: {
          anger: component.config.COLORS[0],
          disgust: component.config.COLORS[1],
          fear: component.config.COLORS[2],
          joy: component.config.COLORS[3],
          sadness: component.config.COLORS[4]
        }
      }
      this.updateEmotionalToneOvertimeChart(data)
    })
  }

  loadKeywordSummary() {
    const changedData$: Observable<Array<CloudData>> = Observable.of(this.keywordCloud)
    changedData$.subscribe(res => this.keywordCloud = res);
    this.analysis.keywordsSummary().map((res) => {
      let keywordsForCloud = []
      for (let k of res.data) {
        keywordsForCloud.push({text: k.key, weight: k.value})
      }
      return keywordsForCloud
    }).subscribe((keywords) => {
      this.keywordCloud = keywords
    })
  }

  updateEmotionalToneOvertimeChart(data) {
    var chart = c3.generate({
      bindto: '#emotion-overtime-chart',
      data: data,
      size: {
        height: 480
      },
      axis: {
        x: {
          type: 'timeseries',
          tick: {
            format: '%_m-%_d-%Y'
          }
        }
      }
    })
  }

  ngOnDestroy() {
    // prevent memory leak when component is destroyed
    this.componentTriggerSub.unsubscribe();
  }

}
