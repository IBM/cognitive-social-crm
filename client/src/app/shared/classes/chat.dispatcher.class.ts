import { EventEmitter } from '@angular/core'
import { ChatMessage } from './chat.message.class'


//
// This class will attempt to handle the timings associated with displaying messages
// received from the remote host. For the purpose of a chat bot, this will
// attempt to make the chat appear more human, as opposed to instant responses
//
export class ChatDispatcher {
  // The actual dispatcher to subscribe to
  public dispatcher: EventEmitter<any> = new EventEmitter()

  // The queue of messages to dispatch
  private dispatchQueue: Array<ChatMessage> = []

  // The indicators that govern the flow of the dispatcher
  private showIndicator: boolean = false
  private indicatorAnimationOutComplete: boolean = false
  private indicatorAnimationInComplete: boolean = false
  private dataReady: boolean = false

  constructor(  ) {
    // Left blank
  }

  // Reset back to original state
  public reset() {
    this.showIndicator = false
    this.indicatorAnimationOutComplete = false
    this.indicatorAnimationInComplete = false
    this.dataReady = false
  }

  public showIndicatorStatus(status: boolean) {
    this.showIndicator = status
    this.evaluateConditions()
  }

  public indicatorOutCompleteStatus(status: boolean) {
    this.indicatorAnimationOutComplete = status
    this.evaluateConditions()
  }

  public indicatorInCompleteStatus(status: boolean) {
    this.indicatorAnimationInComplete = status
    this.evaluateConditions()
  }

  public dataReadyStatus(status: boolean) {
    this.dataReady = status
    this.evaluateConditions()
  }

  public addToQueue(message: ChatMessage) {
    this.dispatchQueue.push(message)
  }

  //
  // The overall flow is as follows:
  // Show an indicator that implies that the remote host is typing
  // Once the indicator is complete and a response is received from the remote host, hide the indicator
  // When the hide indicator event is complete, then display the message.
  // If there are mutliple messages queued, reset the conditions and start by displaying the indicator again.
  //
  private evaluateConditions() {
    if (this.showIndicator) {
      if (!this.dataReady) {
        this.dispatcher.emit({type: 'showIndicator'})
      } else {
        if (this.indicatorAnimationInComplete && !this.indicatorAnimationOutComplete) {
          this.dispatcher.emit({type: 'hideIndicator'})
        } else if (this.indicatorAnimationInComplete && this.indicatorAnimationOutComplete) {
          if (this.dispatchQueue.length > 0) {
            this.dispatcher.emit({type: 'showMessage', data: this.dispatchQueue.shift()})
          }
          this.reset()

          if (this.dispatchQueue.length > 0) {
            this.showIndicatorStatus(true)
            this.dataReadyStatus(true)
          }
        }
      }
      // This is a case where an external message was sent from a source
      // NOT from the chatbox.
      // Basically, the situation is the dispatch process would never have been
      // started in this case, so the messages would never be able to progress
      // through the queue. We'll restart the process by bringing up the indicator
      // again.
    } else if (this.dataReady) {
      this.showIndicator = true
      this.dispatcher.emit({type: 'showIndicator'})
    }
  }
}
