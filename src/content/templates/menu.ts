import { ContentTemplate, ContentType } from '../types';

export const menuTemplate: ContentTemplate = {
  type: ContentType.MENU,
  template: `╭═══ {{botName}} ═══⊷
┃❃╭──────────────
┃❃│ Prefix : {{prefix}}
┃❃│ User : {{userName}}
┃❃│ Time : {{time}}
┃❃│ Day : {{day}}
┃❃│ Date : {{date}}
┃❃│ Version : {{version}}
┃❃│ Plugins : {{plugins}}
┃❃│ Ram : {{ram}}
┃❃│ Uptime : {{uptime}}
┃❃│ Platform : {{platform}}
┃❃╰───────────────
╰═════════════════⊷
{{commandCategories}}`,
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
    'commandCategories'
  ]
};

export const formatCommandCategories = (categories: Record<string, string[]>): string => {
  return Object.entries(categories)
    .map(([categoryName, commands]) => {
      const formattedName = categoryName.toUpperCase().split('').join(' ');
      const commandList = commands.map(cmd => ` │ ${cmd}`).join('\n');
      return ` ╭─❏ ${formattedName} ❏\n${commandList}\n ╰─────────────────`;
    })
    .join('\n');
};

export const defaultMenuCategories = {
  ai: ['𝙱𝙸𝙽𝙶', '𝙳𝙰𝙻𝙻', '𝙶𝙴𝙼𝙸𝙽𝙸', '𝙶𝙿𝚃', '𝙶𝚁𝙾𝚀', '𝚄𝙿𝚂𝙲𝙰𝙻𝙴'],
  audio: ['𝙰𝚅𝙴𝙲', '𝙱𝙰𝚂𝚂', '𝙱𝙻𝙰𝙲𝙺', '𝙱𝙻𝙾𝚆𝙽', '𝙲𝚄𝚃', '𝙳𝙴𝙴𝙿', '𝙴𝙰𝚁𝚁𝙰𝙿𝙴'],
  group: ['𝙰𝙳𝙳', '𝙰𝙼𝚄𝚃𝙴', '𝙰𝙽𝚃𝙸𝙵𝙰𝙺𝙴', '𝙰𝙽𝚃𝙸𝙶𝙼', '𝙰𝙽𝚃𝙸𝙻𝙸𝙽𝙺', '𝙰𝙽𝚃𝙸𝚂𝙿𝙰𝙼'],
  download: ['𝙰𝙿𝙺', '𝙵𝙱', '𝙵𝚄𝙻𝙻𝚂𝚂', '𝙸𝙽𝚂𝚃𝙰', '𝙼𝙴𝙳𝙸𝙰𝙵𝙸𝚁𝙴', '𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃'],
  misc: ['𝙰𝙵𝙺', '𝙰𝙻𝙸𝚅𝙴', '𝙰𝚅𝙼', '𝙲𝙰𝙻𝙲', '𝙳𝙴𝙻𝙲𝙼𝙳', '𝙵𝙰𝙽𝙲𝚈']
};
