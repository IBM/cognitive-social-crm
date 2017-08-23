import { Injectable, EventEmitter } from '@angular/core';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { LoopbackLoginService } from '../auth/loopback/lb-login.service'

@Injectable()
export class DashboardService {

  private _componentTriggerSource = new BehaviorSubject<string>('');
  componentTrigger = this._componentTriggerSource.asObservable();

  constructor(private authService: LoopbackLoginService) { }

  public triggerComponent(component) {
    this._componentTriggerSource.next(component);
  }

}
