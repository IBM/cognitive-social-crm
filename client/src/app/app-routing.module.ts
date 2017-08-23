import { NgModule }             from '@angular/core';
import { RouterModule, Routes, RouterOutlet } from '@angular/router';

import { AuthGuard } from './auth/auth.guard';
import { LoopbackLoginComponent } from './auth/loopback/lb-login.component';

import { PageNotFoundComponent } from './page-not-found/page-not-found.component'

const APP_ROUTES: Routes = [
  { path: 'dashboard', loadChildren: './dashboard/dashboard.module#DashboardModule', canLoad: [AuthGuard] },
  { path: 'login', component: LoopbackLoginComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full'  },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [
    RouterModule.forRoot(APP_ROUTES)
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule {}
