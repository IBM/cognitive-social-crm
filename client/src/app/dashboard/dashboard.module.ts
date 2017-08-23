import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }   from '@angular/forms';

import { Ng2PageScrollModule } from 'ng2-page-scroll';

import { DashboardRoutingModule } from './dashboard-routing.module'

import { AlertModule, CollapseModule, BsDropdownModule, ButtonsModule, ModalModule, PaginationModule } from 'ngx-bootstrap';

import { SharedModule } from '../shared/shared.module'

import { NavbarComponent } from './navbar/navbar.component';

import { StatusComponent } from './analysis/status/status.component'
import { AllocationComponent } from './analysis/allocation/allocation.component'
import { AnalysisComponent } from './analysis/analysis.component'

import { DashboardService } from './dashboard.service'
import { TweetsViewComponent } from './tweets-view/tweets-view.component';
import { TweetDetailsComponent } from './tweets-view/tweet-details/tweet-details.component';
import { TrendsComponent } from './analysis/trends/trends.component';
import { ChatBotComponent } from './chat-bot/chat-bot.component';

import { ChatModule } from '../shared/chat/chat.module'

import { TagCloudModule } from 'angular-tag-cloud-module';
import { ReceiverAdminComponent } from './receiver-admin/receiver-admin.component';

@NgModule({
  imports: [
    CommonModule,
    TagCloudModule,
    FormsModule,
    DashboardRoutingModule,
    SharedModule,
    ChatModule,
    Ng2PageScrollModule.forRoot(),
    ModalModule.forRoot(),
    PaginationModule.forRoot(),
    AlertModule.forRoot(),
    CollapseModule.forRoot(),
    BsDropdownModule.forRoot(),
    ButtonsModule.forRoot()
  ],
  declarations: [
    StatusComponent,
    AllocationComponent,
    AnalysisComponent,
    NavbarComponent,
    TweetsViewComponent,
    TrendsComponent,
    ChatBotComponent,
    TweetDetailsComponent,
    ReceiverAdminComponent
  ],
  providers: [
    DashboardService
  ]
})
export class DashboardModule { }
