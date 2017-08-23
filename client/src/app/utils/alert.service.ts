import { Injectable } from '@angular/core';

import { Observable } from 'rxjs/Rx';
import { Subject } from 'rxjs/Subject';

// Import RxJs required methods
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

@Injectable()
export class AlertService {

  /*
  * This service showcases how to send a message to a parent, from a child or peer.
  */
  private alert: any = {}

  constructor() {}

  // Create a subject that will be exposed as an Observable
  private _alertSource: Subject<any> = new Subject<any>();

  // This function is used by the parent to subscribe to messages
  // from the client or peer.
  getAlerted(): Observable<any> {
    return this._alertSource.asObservable();
  }

  // This function is used by the client or peer to publish a message
  // to the subscribed parents or peers.
  setAlert(type, msg) {
    this.alert.type = type
    this.alert.msg = msg
    this._alertSource.next(this.alert)
  }

}
