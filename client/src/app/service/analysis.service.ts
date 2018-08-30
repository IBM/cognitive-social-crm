import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {

  uri = environment.api_url + '/analysis';

  constructor(private http: HttpClient) { }

  getClassificatonSummary(): Observable<any> {
    return this.http.get(`${this.uri}/classificationSummary`);
  }

  getSentimentOverTime(): Observable<any> {
    return this.http.get(`${this.uri}/sentimentOverTime`);
  }

  getSentimentTrend(): Observable<any> {
    return this.http.get(`${this.uri}/sentimentTrend`);
  }

  getSentimentSummary(): Observable<any> {
    return this.http.get(`${this.uri}/sentimentSummary`);
  }

  getKeywordsSummary(): Observable<any> {
    return this.http.get(`${this.uri}/keywordsSummary`);
  }

  getEmotionalToneOverTime(): Observable<any> {
    return this.http.get(`${this.uri}/emotionalToneOverTime`);
  }

  getPostsByDate(limit, skip): Observable<any> {
    return this.http.get(`${this.uri}/listByPostDate`, {
      params: new HttpParams()
      .set('skip', skip)
      .set('limit', limit),
    });
  }
}
