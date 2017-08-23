//
// Implementation of alchemy integration
//

import { Injectable } from '@angular/core'
import { Http, Response } from '@angular/http'
import { Observable } from 'rxjs/Observable'
import * as qs from 'querystring'
import 'rxjs/add/operator/map'

@Injectable()
export class NLUService {
  private _sentimentUrl = window.location.origin + '/api/nlu/getSentiment'
  private _emotionUrl = window.location.origin + '/api/nlu/getEmotion'
  constructor(private _http: Http) {
  }

  getSentiment(text: string): Observable<any> {
    return this._http.get(this._sentimentUrl + '?' + qs.stringify({text: text, access_token: sessionStorage.getItem('wsl-api-token')}))
      .map((res: Response) => res.json())
  }

  getEmotion(text: string): Observable<any> {
    return this._http.get(this._emotionUrl + '?' + qs.stringify({text: text, access_token: sessionStorage.getItem('wsl-api-token')}))
      .map((res: Response) => res.json())
  }
}
