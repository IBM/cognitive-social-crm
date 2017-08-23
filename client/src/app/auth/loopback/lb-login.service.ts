import { Injectable } from '@angular/core';

import { Http, Response, Headers, RequestOptions, URLSearchParams } from '@angular/http';
import { Router } from '@angular/router';

import {Observable} from 'rxjs/Rx';

// Import RxJs required methods
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

@Injectable()
export class LoopbackLoginService {

  // private instance variable to hold base url
  private loginUrl = '/api/auth/login';
  private logoutUrl = '/api/auth/logout';
  private findByIdUrl = '/api/auth';
  private isInRoleUrl = '/api/auth/isInRole'
  // key used for saving the token in session storage
  private TOKEN_KEY = 'wsl-api-token';
  private USER_ID_KEY = 'wsl-userid';

  // Resolve HTTP using the constructor
  constructor (private http: Http, private router: Router) {}

  // Function that will indicate if a user is logged in or not.
  public isAuthenticated(): Observable<boolean> | boolean {
    let stored = this.get();
    let authenticated;
    if (stored && stored.token && stored.id) {
      let url = this.findByIdUrl + '/' + stored.id + '/accessTokens/' + stored.token + '?access_token=' + stored.token;
      return this.http.get(url)
        .map((res: Response) => {
          return true
        })
        .catch((error:any) => {
          this.destroyToken();
          return Observable.create(observer => {
            this.router.navigate(['/login'])
            observer.next(false)
            observer.complete()
          });
        });
    } else {
      return Observable.create(observer => {
        this.router.navigate(['/login'])
        observer.next(false)
        observer.complete()
      });
    }
  }

  // Returns an Observable that will make the login request to the server and return the json containing the token
  public login(credentials: any): Observable<any> {
    let bodyString = JSON.stringify(credentials); // Stringify credentials payload
    let headers = new Headers({ 'Content-Type': 'application/json' }); // ... Set content type to JSON
    let options = new RequestOptions({ headers: headers }); // Create a request option

    return this.http.post(this.loginUrl, credentials, options) // ...using post request
       .map((res:Response) => {
         this.save(res.json());
         this.router.navigate(['/']);
         return res.json();
       })
       .catch((error:any) => Observable.throw(error.json().error || 'Server error'));
  }

  // Returns an Observable that will make the logout request to the server with the token in session storage
  public logout() : Observable<string> {
    let stored = this.get();
    if (stored && stored.token) {
      let url = this.logoutUrl + '?access_token=' + stored.token;
      let options = new RequestOptions({ }); // Create a request option
      return this.http.post(url, {} ,options)
        .map((res: Response) => {
          this.destroyToken();
          this.router.navigate(['login']);
          return true;
        })
        .catch((err: Response | any) => Observable.throw('Logout Error: ' + err));
    }
  }

  public isInRole(role): Observable<any> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('access_token', this.get().token);
    params.set('role', role);
    let requestOptions = new RequestOptions({
      search: params
    });
    return this.http.get(this.isInRoleUrl, requestOptions)
       .map((res:Response) => res.json().isInRole)
       .catch((error:any) => {
         if (error.status === 401) {
           this.router.navigate(['login'])
         }
         return Observable.throw(error.json().error || 'Server error')
       });
  }

  // Remove the token from session storage.
  public destroyToken(): boolean {
    let stored = this.get();
    if (stored) {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_ID_KEY);
      return true;
    }
    return false;
  }

  // Function that will make an authenticated GET request to the server.  If an Unauthenicated is returned by
  // the server, then it will route to the login page.
  // You need a URL and an array of objects that contains a name and value for example [ { name: 'id', value: 1 }]
  public makeAuthenticatedHttpGet(url, queryParams?) : Observable<any> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('access_token', this.get().token);
    if (queryParams && queryParams.length > 0) {
      for (let qp of queryParams) {
        params.set(qp.name, qp.value.toString())
      }
    }
    let requestOptions = new RequestOptions({
      search: params
    });
    return this.http.get(url, requestOptions)
       .map((res:Response) => res.json())
       .catch((error:any) => {
         if (error.status === 401) {
           this.router.navigate(['login'])
         }
         return Observable.throw(error.json().error || 'Server error')
       });
  }

  // Function that will make an authenticated POST request to the server.  If an Unauthenicated is returned by
  // the server, then it will route to the login page.
  // You need a URL and an array of objects that contains a name and value for example [ { name: 'id', value: 1 }]
  public makeAuthenticatedHttpPost(url, formData) : Observable<any> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('access_token', this.get().token);
    let requestOptions = new RequestOptions();
    requestOptions.search = params;
    return this.http.post(url, formData, requestOptions)
       .map((res:Response) => res.json())
       .catch((error:any) => {
         if (error.status === 401) {
           this.router.navigate(['login'])
         }
         return Observable.throw(error.json().error || 'Server error')
       });
  }

  public makeAuthenticatedHttpJsonPost(url, data) : Observable<any> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('access_token', this.get().token);
    let headers = new Headers({'Content-Type':'application/json'});
    let requestOptions = new RequestOptions({
      headers: headers,
      search: params,
      body: JSON.stringify(data)
    });
    return this.http.post(url, {}, requestOptions)
       .map((res:Response) => res.json())
       .catch((error:any) => {
         if (error.status === 401) {
           this.router.navigate(['login'])
         }
         return Observable.throw(error.json().error || 'Server error')
       });
  }

  public makeAuthenticatedHttpDelete(url, queryParams?) : Observable<any> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('access_token', this.get().token);
    if (queryParams && queryParams.length > 0) {
      for (let qp of queryParams) {
        params.set(qp.name, qp.value.toString())
      }
    }
    let requestOptions = new RequestOptions({
      search: params
    });
    return this.http.delete(url, requestOptions)
       .map((res:Response) => res.json())
       .catch((error:any) => {
         if (error.status === 401) {
           this.router.navigate(['login'])
         }
         return Observable.throw(error.json().error || 'Server error')
       });
  }

  // Retrieve the api token from the session storage and null if not found
  get() {
    return {
      token: sessionStorage.getItem(this.TOKEN_KEY),
      id: sessionStorage.getItem(this.USER_ID_KEY)
    }
  }

  // Save the token returned from the login response in session storage
  save(credentials: any) {
    if (credentials && credentials.id) {
      sessionStorage.setItem(this.TOKEN_KEY, credentials.id);
      sessionStorage.setItem(this.USER_ID_KEY, credentials.userId);
    }
  }

}
