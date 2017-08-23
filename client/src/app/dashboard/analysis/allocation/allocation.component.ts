import { Component, OnInit } from '@angular/core';

import {Subscription} from 'rxjs/Subscription';

import { ConfigService } from '../../../shared/config.service'
import { DashboardService } from '../../dashboard.service'
import { AnalysisService } from '../../../shared/analysis.service'

const MY_COMPONENT_NAME = 'allocation';

declare var c3:any

@Component({
  selector: 'app-allocation',
  templateUrl: './allocation.component.html',
  styleUrls: ['./allocation.component.css']
})
export class AllocationComponent implements OnInit {

  private componentTriggerSub:Subscription;

  constructor(private dashboardService: DashboardService, private analysis: AnalysisService, private config: ConfigService) { }

  ngOnInit() {
    // Only load the data on this component when it's triggered.
    this.componentTriggerSub = this.dashboardService.componentTrigger.subscribe((component) => {
       if (component === MY_COMPONENT_NAME) {
         console.log('Loading Allocation Component')
         this.loadClassificationSummary()
         this.loadSentimentOverTime();
       }
     })
  }

  loadClassificationSummary() {
    let component = this
    this.analysis.classificationSummary().subscribe((classifications) => {
      let data = {
        x : 'classification',
        type: 'bar',
        json: classifications,
        color: function (color, d) {
          return component.config.COLORS[d.index]
        }
      }
      this.updateClassificationChart(data)
    })
  }

  loadSentimentOverTime() {
    let component = this
    this.analysis.sentimentOvertime().subscribe((sentiments) => {
      let data = {
        xFormat: '%_m-%_d-%Y',
        type: 'spline',
        x: 'dates',
        json: sentiments,
        colors: {
          positive: component.config.COLORS[1],
          neutral: component.config.COLORS[2],
          negative: component.config.COLORS[3]
        }
      }
      this.updateSentimentOvertimeChart(data)
    })
  }

  updateClassificationChart(classifications) {
    var chart = c3.generate({
      bindto: '#tweet-classification-chart',
      data: classifications,
      bar: {
        width: {
          ratio: 0.8
        }
      },
      size: {
        height: 480
      },
      axis: {
        x: {
          type: 'category',
          tick: {
              rotate: 75,
              multiline: false
          },
          height: 130
        }
      }
    })
  }

  updateSentimentOvertimeChart(data) {
    var chart = c3.generate({
      bindto: '#sentiment-overtime-chart',
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
