import { Component, OnInit, Renderer2 } from '@angular/core';

import { ConfigService } from '../../shared/config.service'
import { DashboardService } from './../dashboard.service'

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.css']
})
export class AnalysisComponent implements OnInit {

  private statusRefreshTimer:any
  private components = ['status', 'allocation', 'trends']

  constructor(private renderer: Renderer2, private dashboardService: DashboardService, private config: ConfigService) { }

  ngOnInit() {
    // Load the content on this page in phases to not get errors from Cloudant.
    this.dashboardService.triggerComponent('status')
    setTimeout(() => {
      this.dashboardService.triggerComponent('allocation')
      setTimeout(() => {
        this.dashboardService.triggerComponent('trends')
      }, this.config.ANALYSIS_LOAD_DELAY)
    }, this.config.ANALYSIS_LOAD_DELAY)
    // Schedule to have the Status Component refreshed every 60 seconds.
    this.scheduleStatusRefresh()
  }

  scheduleStatusRefresh () {
    // Only start this timer once.
    if (!this.statusRefreshTimer) {
      this.statusRefreshTimer = setTimeout(() => {
        this.dashboardService.triggerComponent('status')
        this.statusRefreshTimer = null
        this.scheduleStatusRefresh()
      }, this.config.STATUS_REFRESH_DELAY)
    }
  }

  ngOnDestroy() {
    this.statusRefreshTimer = null
    clearTimeout(this.statusRefreshTimer)
  }
}
