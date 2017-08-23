import { Injectable, EventEmitter } from '@angular/core'
import { AppCommEvent } from './classes/appcomm.event.class'
import { ConversationService } from './conversation.service'
import { NLUService } from './nlu.service'

@Injectable()
export class AppCommService {
  public static typeEnum = {
    conversationSent: 'CONVSENT',
    conversationReceived: 'CONVRECEIVED',
    alchemy: 'ALCHEMY',
    conversationIntentsReceived: 'INTENTSRECEIVED',
    showDetailsPopup: 'SHOWDETAILS'
  }
  public static subTypeEnum = {
    conversationSent: {
      standard: 'STANDARD',
      external: 'EXTERNAL'
    },
    alchemy: {
      sentiment: 'SENTIMENT',
      emotion: 'EMOTION',
      veryLowSentiment: 'VERYLOWSENTIMENT'
    }
  }
  public appComm$ = new EventEmitter<AppCommEvent>()
  constructor(private _conversation: ConversationService, private _nlu: NLUService) {
  }

  // Send a message and show the outgoing message in the chat window.
  public sendMessage(message: string, context: any, external = false) {
    // Conversation sent event
    this.appComm$.emit(new AppCommEvent(AppCommService.typeEnum.conversationSent, external ? AppCommService.subTypeEnum.conversationSent.external : AppCommService.subTypeEnum.conversationSent.standard, message))
    if (!external) {
      // this.getSentiment(message)
      // this.getEmotion(message)
    }
    this._conversation.sendMessage(message).subscribe(response => {
      // Conversation received event
      this.appComm$.emit(new AppCommEvent(AppCommService.typeEnum.conversationReceived, '', response.text))
      // Conversation intents updated event
      // this.appComm$.emit(new AppCommEvent(AppCommService.typeEnum.conversationIntentsReceived, '', response.conversationResponse.intents))
    })
  }

  public getSentiment(text: string) {
    this._nlu.getSentiment(text).subscribe(response => {
        this.appComm$.emit(new AppCommEvent(AppCommService.typeEnum.alchemy, AppCommService.subTypeEnum.alchemy.sentiment, response))
        if (Number(response.sentimentScore) * 100 < -80) {
          this.appComm$.emit(new AppCommEvent(AppCommService.typeEnum.alchemy, AppCommService.subTypeEnum.alchemy.veryLowSentiment, {}))
        }
    })
  }

  public getEmotion(text: string) {
    this._nlu.getEmotion(text).subscribe(response => {
        this.appComm$.emit(new AppCommEvent(AppCommService.typeEnum.alchemy, AppCommService.subTypeEnum.alchemy.emotion, response))
    })
  }

  public showDetailsPopup() {
    this.appComm$.emit(new AppCommEvent(AppCommService.typeEnum.showDetailsPopup, '', {}))
  }
}
