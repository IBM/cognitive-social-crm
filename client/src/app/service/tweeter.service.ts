import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TweeterService {

  private uri = environment.api_url + '/tweets';

  constructor(private http: HttpClient) { }

  public listenerStatus(): Observable<any> {
    const url = this.uri + '/status';
    return this.http.get(`${this.uri}/status`);
  }
}
