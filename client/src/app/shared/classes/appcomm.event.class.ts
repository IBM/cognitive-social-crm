//
// This represents a standard 'AppComm' event used for intra-app communication
//
export class AppCommEvent {
  public type: string // Type of the event (ex: Messages)
  public subType: string // Subtype of the event (ex: Added, Removed)
  public data: any // Payload of event
  constructor(type: string, subType: string, data: any ) {
    this.type = type
    this.subType = subType
    this.data = data
  }
}
