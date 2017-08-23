import { Injectable } from '@angular/core';

@Injectable()
export class ConfigService {

  // These are the colors used on the charts and can be customized.
  COLORS = ['#c5d86d', '#0090c1', '#ee964b', '#d1495b', '#00798c']

  POSITIVE = '#c5d86d'
  NEGATIVE = '#d1495b'

  WATSON = '#0090c1'
  AGENT = '#c5d86d'

  // The analysis page sections is delayed to not exceed the Cloudant
  // limits.
  ANALYSIS_LOAD_DELAY = 1000
  // The setting that tells the app how often to analysis page should be reloaded.
  STATUS_REFRESH_DELAY = 60000

  TONE_ICONS = {
    anger: '<i class="fa fa-thumbs-o-down fa-lg" aria-hidden="true"></i>',
    disgust: '<i class="fa fa-thumbs-o-down fa-lg" aria-hidden="true"></i>',
    sadness: '<i class="fa fa-thumbs-o-down fa-lg" aria-hidden="true"></i>',
    fear: '<i class="fa fa-thumbs-o-down fa-lg" aria-hidden="true"></i>',
    joy: '<i class="fa fa-thumbs-o-up fa-lg" aria-hidden="true"></i>'
  }

  // The Classification that will be allocated to Watson.  This drives the
  // donut chart on the first page.
  ALLOCATION_TO_WATSON = ['SERVICE']

  constructor() { }

  public toTitleCase(str:string) {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    })
  }

}
