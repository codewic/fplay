import { ContentTemplate, ContentType } from '../types';

export const helpTemplate: ContentTemplate = {
  type: ContentType.HELP,
  template: `╭────────────────╮
      {{botName}}
╰────────────────╯

╭────────────────
│ Prefix : {{prefix}}
│ User : {{userName}}
│ Time : {{time}}
│ Day : {{day}}
│ Date : {{date}}
│ Version : {{version}}
│ Plugins : {{plugins}}
│ Ram : {{ram}}
│ Uptime : {{uptime}}
│ Platform : {{platform}}
╰────────────────
╭────────────────
{{commandList}}
╰────────────────`,
  requiredVariables: [
    'botName',
    'prefix',
    'userName',
    'time',
    'day',
    'date',
    'version',
    'plugins',
    'ram',
    'uptime',
    'platform',
    'commandList'
  ]
};

export const formatHelpCommandList = (commands: string[]): string => {
  return commands
    .map((cmd, index) => `│ ${(index + 1).toString().padStart(3)}  ${cmd}`)
    .join('\n');
};
