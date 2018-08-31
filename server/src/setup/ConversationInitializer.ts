import * as watson from 'watson-developer-cloud';
import logger from '../util/Logger';
import workspace from '../data/SocialCRMWorkspace';

export class ConversationInitializer {

  private conversation: watson.AssistantV1;
  private DEFAULT_NAME: string = 'cognitive-social-crm';

  constructor() {
    this.conversation = new watson.AssistantV1({
      version: '2018-02-16',
    });
  }

  public init() {
    return new Promise((resolve, reject) => {
      const conversationSetupParams = { default_name: this.DEFAULT_NAME, workspace_json: workspace };
      this.setupConversationWorkspace(conversationSetupParams)
                .then((workspaceId) => {
                  resolve(workspaceId);
                }).catch((err) => {
                  logger.error(err);
                  reject(err);
                });
    });
  }

  public setupConversationWorkspace(params: any) {
    return new Promise((resolve, reject) => {
      this.conversation.listWorkspaces({}, (err: any, data: any) => {
        let workspaceId: string = '';
        if (err) {
          logger.error('Error during Conversation listWorkspaces(): ', err);
          reject(new Error('Error. Unable to list workspaces for Conversation: ' + err));
        } else {
          const workspaces = data.workspaces;
          let found: boolean = false;
                    // Find by name, because we probably created it
                    // earlier (in the if block) and want to use it on restarts.
          logger.log('Looking for workspace by name: ', this.DEFAULT_NAME);
          for (let i = 0, size = workspaces.length; i < size; i++) {
            if (workspaces[i].name === this.DEFAULT_NAME) {
              logger.log('Found workspace: ', this.DEFAULT_NAME);
              workspaceId = workspaces[i].workspace_id;
              logger.log(' ID: ', workspaceId);
              found = true;
              break;
            }
          }
          if (!found) {
            logger.log('Creating Conversation workspace ', this.DEFAULT_NAME);
            const ws = params.workspace_json;
            ws.name = this.DEFAULT_NAME;
            this.conversation.createWorkspace(ws, (error: any, wsResp: any) => {
              if (error) {
                reject(new Error('Failed to create Conversation workspace: ' + err));
              } else {
                workspaceId = wsResp.workspace_id;
                logger.log('Successfully created Conversation workspace');
                logger.log('  Name: ', wsResp.name);
                logger.log('  ID:', workspaceId);
                resolve(workspaceId);
              }
            });
          } else {
            resolve(workspaceId);
          }
        }
      });
    });
  }

}
