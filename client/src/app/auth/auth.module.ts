import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { LoopbackLoginComponent } from './loopback/lb-login.component';
import { LoopbackLoginService } from './loopback/lb-login.service';
import { AuthGuard } from './auth.guard';
import { AdminGuard } from './admin.guard';

@NgModule({
  imports:      [ CommonModule, HttpModule, ReactiveFormsModule],
  declarations: [ LoopbackLoginComponent ],
  providers:    [ LoopbackLoginService, AuthGuard, AdminGuard ],
  exports:      [ LoopbackLoginComponent ]
})
export class AuthModule {
  constructor() { }
}
