import { ContentTemplate, ContentType } from '../types';

export const guideTemplate: ContentTemplate = {
  type: ContentType.GUIDE,
  template: `PREFIX    : {{prefix}}
MENU      : {{menuCommands}}
VERSION   : {{version}}
PLUGINS   : {{plugins}}
E-PLUGINS : {{ePlugins}}
SUDO      : {{sudo}}
AUTO READ MSG    : {{autoReadMsg}}
AUTO STATUS VIEW : {{autoStatusView}}
AUTO REJECT CALL : {{autoRejectCall}}
ALWAYS ONLINE    : {{alwaysOnline}}
ANTI DELETE MSG  : {{antiDeleteMsg}}
AUTO UPDATE BOT  : {{autoUpdateBot}}

Telegram : {{telegramUrl}}

Channel : {{channelUrl}}

Plugins : {{pluginsUrl}}

FAQ : {{faqUrl}}

ReadMore : {{readMoreUrl}}`,
  requiredVariables: [
    'prefix',
    'menuCommands',
    'version',
    'plugins',
    'ePlugins',
    'sudo',
    'autoReadMsg',
    'autoStatusView',
    'autoRejectCall',
    'alwaysOnline',
    'antiDeleteMsg',
    'autoUpdateBot',
    'telegramUrl',
    'channelUrl',
    'pluginsUrl',
    'faqUrl',
    'readMoreUrl'
  ]
};

export const defaultGuideContent = {
  prefix: '.',
  menuCommands: '.menu | .help | .list',
  version: '4.0.7',
  plugins: '169',
  ePlugins: '46',
  sudo: '0',
  autoReadMsg: '❎',
  autoStatusView: '❎',
  autoRejectCall: '❎',
  alwaysOnline: '✅',
  antiDeleteMsg: '✅ (p)',
  autoUpdateBot: '✅',
  telegramUrl: 'https://t.me/+TYpRg-AoN4gzNzNl',
  channelUrl: 'https://whatsapp.com/channel/0029Va92msU59PwYuplVMH2L',
  pluginsUrl: 'https://levanter-delta.vercel.app/',
  faqUrl: 'https://levanter-delta.vercel.app/',
  readMoreUrl: 'https://levanter-delta.vercel.app/'
};
