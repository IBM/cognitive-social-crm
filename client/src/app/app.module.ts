import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { CrmRouterModule } from './crm-router/crm-router.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SlimLoadingBarModule } from 'ng2-slim-loading-bar';
import { HttpClientModule } from '@angular/common/http';
import { AnalysisService } from './service/analysis.service';
import { TweeterService } from './service/tweeter.service';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UIConfiguration } from './constant/UIConfiguration';
import { TagCloudModule } from 'angular-tag-cloud-module';
import { TweetDetailsComponent } from './components/tweets/tweets-details/tweets-details.component';
import { AlertModule, CollapseModule, BsDropdownModule, ButtonsModule, ModalModule, PaginationModule } from 'ngx-bootstrap';
import {TweetsComponent} from './components/tweets/tweets.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    DashboardComponent,
    TweetsComponent,
    TweetDetailsComponent,
  ],
  imports: [
    BrowserModule,
    CrmRouterModule,
    SlimLoadingBarModule,
    HttpClientModule,
    TagCloudModule,
    FormsModule,
    ModalModule.forRoot(),
    PaginationModule.forRoot(),
    AlertModule.forRoot(),
    CollapseModule.forRoot(),
    BsDropdownModule.forRoot(),
    ButtonsModule.forRoot(),
  ],
  providers: [AnalysisService, TweeterService, UIConfiguration],
  bootstrap: [AppComponent],
})
export class AppModule { }
