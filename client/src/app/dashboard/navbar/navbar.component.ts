import { Component, OnInit } from '@angular/core';

import { LoopbackLoginService } from '../../auth/loopback/lb-login.service'

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {

  /*
  * This component support smaller devices as well.  The isCollapsed var is used when
  * the navbar is displayed on a smaller device and accesible from the hamburger button.
  */
  public isCollapsed:boolean = false;
  isAdmin:boolean = false

  constructor(private authService: LoopbackLoginService) { }

  ngOnInit() {
    this.authService.isInRole('admin').subscribe((success) => {
      this.isAdmin = success
    })
  }

  logout() {
    this.authService.logout().subscribe((msg) => {
      console.log(msg)
    })
  }
}
