# WhatsApp Bot Backend

A powerful, extensible WhatsApp bot backend built with Node.js, TypeScript, and Baileys.

## 🚀 Features

### Core Features
- **Multi-Session Support**: Handle multiple WhatsApp sessions simultaneously
- **Enhanced Authentication**: Secure credential storage with AES-256-GCM encryption
- **Connection Retry Logic**: Smart reconnection with configurable retry limits
- **Real-time Updates**: Socket.IO integration for live session status
- **Database Integration**: Prisma ORM with PostgreSQL support

### Content Management System
- **Template-Based Messaging**: Dynamic content with variable replacement
- **Welcome Messages**: Automated onboarding for new connections
- **Menu System**: Organized command categories with real-time stats
- **Help & Guide**: Comprehensive documentation and feature status

### Plugin System
- **Modular Architecture**: Easy-to-extend plugin framework
- **Category Organization**: Plugins organized by functionality
- **Permission System**: Admin-only and group-only command support
- **Cooldown Management**: Rate limiting for commands
- **Hot Reloading**: Dynamic plugin loading and reloading

## 📁 Project Structure

```
src/
├── content/                 # Content management system
│   ├── templates/          # Message templates
│   ├── contentService.ts   # Content delivery service
│   └── types.ts           # Content type definitions
├── plugins/                # Plugin system
│   ├── commands/          # Plugin commands by category
│   │   ├── ai/           # AI-related plugins
│   │   ├── download/     # Download plugins
│   │   ├── group/        # Group management
│   │   ├── misc/         # Miscellaneous utilities
│   │   ├── search/       # Search functionality
│   │   ├── sticker/      # Sticker operations
│   │   └── whatsapp/     # WhatsApp utilities
│   ├── basePlugin.ts     # Base plugin class
│   ├── pluginManager.ts  # Plugin management
│   └── types.ts          # Plugin type definitions
├── services/              # Core services
│   ├── whatsappService.ts # Main WhatsApp service
│   ├── sessionService.ts  # Session management
│   ├── messageService.ts  # Message handling
│   └── socketService.ts   # Socket.IO service
├── controllers/           # API controllers
├── routes/               # Express routes
└── utils/                # Utility functions
```

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd whatsapp-bot-backend
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Configure the following variables:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/whatsapp_bot"
AUTH_SECRET="your-secret-key-for-encryption"
PORT=3000
```

4. **Set up the database**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **Start the development server**
```bash
npm run dev
```

## 🔧 Configuration

### Content Templates
Customize bot messages in `src/content/templates/`:
- `welcome.ts` - Welcome messages for new connections
- `guide.ts` - Bot configuration and feature status
- `menu.ts` - Command categories and listings
- `help.ts` - Detailed help information

### Plugin Development
Create new plugins by extending the `BasePlugin` class:

```typescript
import { BasePlugin } from '../../basePlugin';
import { PluginMetadata, PluginContext, PluginResponse, PluginCategory } from '../../types';

export default class MyPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    name: 'My Plugin',
    description: 'Plugin description',
    commands: ['mycommand'],
    category: PluginCategory.MISC,
    version: '1.0.0',
    enabled: true,
    cooldown: 5
  };

  async execute(context: PluginContext): Promise<PluginResponse> {
    await this.sendMessage(context, 'Hello from my plugin!');
    return this.createResponse(true, 'Command executed successfully');
  }
}
```

## 📱 Available Commands

### Content Commands
- `.menu` - Display command categories with bot stats
- `.help` - Show numbered command list
- `.guide` - Bot configuration and features
- `.list` - Detailed command descriptions

### Plugin Commands
- `.ping` - Check bot response time and status
- `.alive` - Display bot alive status
- `.calc <expression>` - Mathematical calculator
- `.tag <all|admin|notadmin>` - Tag group members (admin only)
- `.kick @user` - Remove users from group (admin only)
- `.sticker` - Convert image/video to sticker
- `.qr <text>` - Generate QR code
- `.gpt <question>` - AI assistant (demo mode)
- `.ytv <url>` - YouTube video downloader (demo mode)
- `.weather <location>` - Weather information (demo mode)

## 🔐 Security Features

- **Encrypted Credentials**: All WhatsApp auth data encrypted with AES-256-GCM
- **Session Isolation**: Each session runs independently
- **Permission Checks**: Admin and group-only command restrictions
- **Rate Limiting**: Cooldown system prevents spam
- **Input Validation**: Sanitized user inputs

## 🚀 API Endpoints

### Session Management
- `POST /api/sessions` - Create new WhatsApp session
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:id` - Get session details
- `DELETE /api/sessions/:id` - Delete session

### Messages
- `GET /api/sessions/:id/messages` - Get session messages
- `POST /api/sessions/:id/send` - Send message

### Health Check
- `GET /api/health` - Service health status

## 🔄 Real-time Events

The bot emits Socket.IO events for real-time updates:

- `qr_code` - QR code for session authentication
- `session_status` - Session connection status changes
- `new_message` - Incoming messages
- `session_created` - New session created
- `session_deleted` - Session removed

## 🧪 Development

### Adding New Plugins
1. Create plugin file in appropriate category folder
2. Extend `BasePlugin` class
3. Implement required metadata and execute method
4. Plugin will be auto-loaded on restart

### Content Customization
1. Modify templates in `src/content/templates/`
2. Update default content variables
3. Add new content types as needed

### Database Changes
1. Update Prisma schema
2. Generate migration: `npx prisma migrate dev`
3. Update TypeScript types: `npx prisma generate`

## 📊 Monitoring

- **Logging**: Comprehensive logging with Winston
- **Health Checks**: Built-in health monitoring
- **Session Tracking**: Real-time session status
- **Error Handling**: Graceful error recovery

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review existing plugins for examples

## 🔮 Roadmap

- [ ] Advanced AI integrations (OpenAI, Gemini)
- [ ] Media processing capabilities
- [ ] Advanced group management features
- [ ] Plugin marketplace
- [ ] Web dashboard
- [ ] Multi-language support
- [ ] Advanced analytics