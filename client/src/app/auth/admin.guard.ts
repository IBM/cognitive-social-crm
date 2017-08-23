import { Injectable } from '@angular/core';
import { Router, Route, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject } from 'rxjs/Rx';

import { LoopbackLoginService } from './loopback/lb-login.service';

@Injectable()
export class AdminGuard implements CanActivate {

  constructor(private router: Router, private authService: LoopbackLoginService) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
    console.log('In canActivate for admin guard...')
    return this.authService.isInRole('admin')
  }
}
