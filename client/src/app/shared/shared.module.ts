import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConfigService } from './config.service'
import { TwitterService } from './twitter.service'
import { AnalysisService } from './analysis.service'
import { AppCommService } from './app-comm.service'
import { ConversationService } from './conversation.service'
import { NLUService } from './nlu.service'

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [ TwitterService, AnalysisService, ConfigService, AppCommService, ConversationService, NLUService ]
})
export class SharedModule { }
