import { Injectable } from '@angular/core';

import { Observable } from 'rxjs/Rx';

import { LoopbackLoginService } from '../auth/loopback/lb-login.service';

const TWITTER_URL = 'api/Twitter'

@Injectable()
export class TwitterService {

  constructor(private authService: LoopbackLoginService) { }

  public listenerStatus(): Observable<any> {
    let url = TWITTER_URL + '/status'
    return this.authService.makeAuthenticatedHttpGet(url)
  }

}
