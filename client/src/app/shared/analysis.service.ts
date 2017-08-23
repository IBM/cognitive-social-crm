import { Injectable } from '@angular/core';

import { Observable } from 'rxjs/Rx';

import { LoopbackLoginService } from '../auth/loopback/lb-login.service';

const ANALYSIS_URL = 'api/Analysis'

@Injectable()
export class AnalysisService {

  constructor(private authService: LoopbackLoginService) { }

  public listByPostDate(limit, skip): Observable<any> {
    let url = ANALYSIS_URL + '/listByPostDate'
    return this.authService.makeAuthenticatedHttpGet(url, [{ name: 'skip', value: skip }, { name: 'limit', value: limit }])
  }

  public classificationSummary() : Observable<any> {
    let url = ANALYSIS_URL + '/classificationSummary'
    return this.authService.makeAuthenticatedHttpGet(url)
  }

  public emotionalToneOvertime() : Observable<any> {
    let url = ANALYSIS_URL + '/emotionalToneOvertime'
    return this.authService.makeAuthenticatedHttpGet(url)
  }

  public sentimentSummary() : Observable<any> {
    let url = ANALYSIS_URL + '/sentimentSummary'
    return this.authService.makeAuthenticatedHttpGet(url)
  }

  public sentimentOvertime() : Observable<any> {
    let url = ANALYSIS_URL + '/sentimentOvertime'
    return this.authService.makeAuthenticatedHttpGet(url)
  }

  public keywordsSummary() : Observable<any> {
    let url = ANALYSIS_URL + '/keywordsSummary'
    return this.authService.makeAuthenticatedHttpGet(url)
  }

  public sentimentTrend() : Observable<any> {
    let url = ANALYSIS_URL + '/sentimentTrend'
    return this.authService.makeAuthenticatedHttpGet(url)
  }

  public destroyTweet(id) : Observable<any> {
    let url = ANALYSIS_URL + '/' + id
    return this.authService.makeAuthenticatedHttpDelete(url)
  }
}
