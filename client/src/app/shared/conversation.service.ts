import { Injectable, EventEmitter } from '@angular/core'
import { Http, Response } from '@angular/http'
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map'


@Injectable()
export class ConversationService {
  public externalMessage$: EventEmitter<any>
  public watsonDetails$: EventEmitter<any>
  private _url = window.location.origin + '/api/watson-conversation/send'
  private user = String(Math.floor(Math.random() * 100000000)) // Random username to associate on server side
  constructor(private _http: Http) {
    this.externalMessage$ = new EventEmitter()
    this.watsonDetails$ = new EventEmitter()
  }

  sendMessage(message: string): Observable<any> {
    let body: any = {
      input: {
        text: message,
        user: this.user
      }
    }
    return this._http.post(this._url + '?access_token=' + sessionStorage.getItem('wsl-api-token'), body)
      .map((res: Response) => res.json())
  }
  /**
   * For sending messages from a source that is
   * NOT from the message input panel
   */
  sendExternalMessage(message: String, type = 'text') {
    this.externalMessage$.emit(
      {
        message: message,
        type: type
      })
  }

  showWatsonDetails() {
    this.watsonDetails$.emit(true)
  }
}
