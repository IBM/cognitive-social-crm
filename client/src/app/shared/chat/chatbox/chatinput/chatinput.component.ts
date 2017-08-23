import { Component, EventEmitter, Output, AfterViewInit, ViewChild, ElementRef, Renderer } from '@angular/core'
import * as moment from 'moment'


@Component({
  selector: 'wcga-chatinput',
  templateUrl: './chatinput.component.html',
  styleUrls: ['./chatinput.component.css']
})
export class ChatinputComponent implements AfterViewInit {
  public text: string = ''
  @Output() sendMessage = new EventEmitter<string>()
  @ViewChild('chatInput') private inputElement: ElementRef
  @ViewChild('sendButton') private sendButton: ElementRef
  private inputType = 'text'
  private validateType = ''
  private placeholderText = 'Enter your message'
  private valid = false
  constructor(private renderer: Renderer) {

  }
  // Validate the input based on the marked validateType
  validateInput() {
    if (this.text.length > 0) {
      this.valid = true
    } else {
      this.valid = false
    }

    // Check if the send button should show
    if (!this.valid) {
      this.renderer.invokeElementMethod(this.sendButton.nativeElement, 'setAttribute', ['disabled', true])
    } else {
      this.renderer.invokeElementMethod(this.sendButton.nativeElement, 'removeAttribute', ['disabled'])
    }
  }
  // Press enter to submit
  emitKeyPress(e) {
    if (this.valid) {
      if (e.code === 'Enter' || e.code === 'enter') {
        this.emitSendMessage()
      }
    }
  }
  // Let the app know we are sending a message. Formats dates appropriately
  emitSendMessage() {
    if (this.text) {
      if (this.inputType === 'date') {
        this.text = moment(this.text).format('MM-DD-YYYY')
      }
      this.sendMessage.emit(this.text)
    }
    this.text = ''
    this.validateType = ''
    this.placeholderText = 'Enter your message'
    this.valid = false
    this.renderer.invokeElementMethod(this.inputElement.nativeElement, 'focus')
    this.validateInput()
  }

  ngAfterViewInit() {
    this.renderer.invokeElementMethod(this.inputElement.nativeElement, 'focus')
    this.validateInput()
  }
}
