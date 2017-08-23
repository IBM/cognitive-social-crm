//
// This represents a single chat message.
//
export class ChatMessage {
  // Explicitly defined for clarity
  public message: string // The body of the message
  public direction: string // The direction of the message: (to/from) Watson
  public type: string // The type of message (most of the time, text, but enrichments are ID'd here)
  public pending: boolean // Tag the message as pending. Used for the typing indicator. Only set to true for the indicator element
  public enrichment: any // The enrichment data (if any)
  constructor(message: string, direction: string, type = 'text', pending = false, enrichment: any = undefined) {
    this.message = message
    this.direction = direction
    this.type = type
    this.pending = pending
    this.enrichment = enrichment
  }
}
