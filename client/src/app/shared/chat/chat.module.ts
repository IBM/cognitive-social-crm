import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { CommonModule } from '@angular/common'
import { ChatboxComponent } from './chatbox/chatbox.component'
import { ChatinputComponent } from './chatbox/chatinput/chatinput.component'
import { ChatbubbleComponent } from './chatbox/chatbubble/chatbubble.component'
import { ModalModule } from 'ngx-bootstrap/modal'
import { LinkyModule } from 'angular-linky'

// import { ChatExtensionsModule } from '../chat-extensions/chat-extensions.module'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ModalModule.forRoot(),
//    ChatExtensionsModule,
    LinkyModule
  ],
  exports : [
    ChatboxComponent
  ],
  declarations: [
    ChatboxComponent,
    ChatinputComponent,
    ChatbubbleComponent
  ]
})
export class ChatModule { }
