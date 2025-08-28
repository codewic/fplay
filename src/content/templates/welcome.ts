import { ContentTemplate, ContentType } from '../types';

export const welcomeTemplate: ContentTemplate = {
  type: ContentType.WELCOME,
  template: `Welcome to our awesome community! Come hang out with us for fun chats, cool ideas, and lots of love. Remember the rules: no sharing links, spamming, spreading hate, or being mean. We're all about respect and kindness here.

Telegram Group {{telegramGroup}}
Must Read Rules!!!

Whatsapp Group {{whatsappGroup}}
Read Group Description!!!

Check out {{pluginsUrl}} for some awesome add-ons to make things even more awesome. Got questions? Just shoot a message with the deets or read up on our FAQ {{faqUrl}}. Show some love by donating to our awesome community at {{donateUrl}}.

Dive into exciting talks, unleash your inner creativity, and make new friends. Let's explore, inspire each other, and grow as a group! Can't wait to see you there! 🔥
{{channelUrl}}`,
  requiredVariables: [
    'telegramGroup',
    'whatsappGroup', 
    'pluginsUrl',
    'faqUrl',
    'donateUrl',
    'channelUrl'
  ]
};

export const defaultWelcomeContent = {
  telegramGroup: 'https://t.me/+TYpRg-AoN4gzNzNl',
  whatsappGroup: 'https://chat.whatsapp.com/GIkPt9cLI12H9ebv6OMOkH',
  pluginsUrl: 'levanter-plugins.vercel.app',
  faqUrl: 'levanter-plugins.vercel.app/faq',
  donateUrl: 'levanter-plugins.vercel.app/donate',
  channelUrl: 'https://whatsapp.com/channel/0029Va92msU59PwYuplVMH2L'
};
