import { Injectable } from '@angular/core';
import { Router, Route, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, Subject } from 'rxjs/Rx';

import { LoopbackLoginService } from './loopback/lb-login.service';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private router: Router, private authService: LoopbackLoginService) { }

  // Use this function when you want to allow a route to be access only when the user is authenticated
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
    return this.authService.isAuthenticated();
  }

  // Use this function when a module should be loaded via lazy loading only when a user is authenticated
  canLoad(route: Route): Observable<boolean> | boolean{
    return this.authService.isAuthenticated();
  }

  idAdmin(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
    return this.authService.isInRole('admin')
  }
}
