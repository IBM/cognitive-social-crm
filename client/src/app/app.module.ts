import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgModule } from '@angular/core';
import { PathLocationStrategy, LocationStrategy } from '@angular/common';

import {} from 'jasmine';

import { AuthModule } from './auth/auth.module';
import { AppRoutingModule } from './app-routing.module';

import { SharedModule } from './shared/shared.module'

import { AlertService } from './utils/alert.service'

import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    AuthModule,
    SharedModule
  ],
  providers: [{provide: LocationStrategy, useClass: PathLocationStrategy}, AlertService],
  bootstrap: [AppComponent]
})
export class AppModule { }
