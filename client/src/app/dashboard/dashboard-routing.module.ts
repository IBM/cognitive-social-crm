import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes, RouterOutlet, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AdminGuard } from '../auth/admin.guard';

import { AnalysisComponent } from './analysis/analysis.component'
import { TweetsViewComponent } from './tweets-view/tweets-view.component'
import { ChatBotComponent } from './chat-bot/chat-bot.component'
import { ReceiverAdminComponent } from './receiver-admin/receiver-admin.component'

const RETAIL_ROUTES: Routes = [
  { path: 'analysis', component: AnalysisComponent },
  { path: 'tweets-view', component: TweetsViewComponent },
  { path: 'chat-bot', component: ChatBotComponent },
  { path: 'receiver-admin', component: ReceiverAdminComponent, canActivate: [AdminGuard] },
  { path: '', redirectTo: 'analysis', pathMatch: 'full'  },
];

@NgModule({
  imports: [
    RouterModule.forChild(RETAIL_ROUTES)
  ],
  declarations: [],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
