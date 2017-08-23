import { Component, OnInit, Input, trigger, state, style, transition, animate, EventEmitter, Output} from '@angular/core'

@Component({
  selector: 'wcga-chatbubble',
  templateUrl: './chatbubble.component.html',
  styleUrls: ['./chatbubble.component.css'],
  animations: [
  trigger('flyInOut', [
    state('inRight', style({transform: 'none'})),
    state('inLeft', style({transform: 'none'})),
    transition('void => inRight', [
      style({transform: 'translateX(100%)'}),
      animate('150ms cubic-bezier(0, .7, 0.5, 1)')
    ]),
    transition('void => inLeft', [
      style({transform: 'translateX(-100%)'}),
      animate('150ms cubic-bezier(0, .7, 0.5, 1)')
    ]),
    transition('inLeft => void', [
      animate('150ms 500ms cubic-bezier(.7, 0, 1, .5)', style({transform: 'translateX(-100%)'}))
    ])
  ])
]
})
export class ChatbubbleComponent implements OnInit {
  @Input() message: string
  @Input() direction: string = 'to'
  @Input() type: string = 'text'
  @Input() enrichment: any
  @Input() adjacent: boolean // is adjacent to a previous message from same source?
  @Input() showMessage: boolean = true
  @Output() animateEnd = new EventEmitter()


  constructor() {
  }

  ngOnInit() {
    this.direction = this.direction.toLowerCase() + '-watson'

  }
  // Let the app know that it's animation is done
  animationDone($event) {
    let direction = ''
    if ($event.fromState === 'void') {
      direction = 'in'
    } else {
      direction = 'out'
    }
    this.animateEnd.emit(direction)
  }
}
