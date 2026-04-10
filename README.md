# Astra - Real-Time Video Synchronization Platform

![Astra Banner](https://astra-sync.vercel.app/og-image.png)

Astra is a real-time video synchronization platform designed for watch parties. Stream movies, TV shows, and anime with friends while keeping everyone perfectly in sync.

## ✨ Features

- **Real-Time Synchronization**: Perfect playback sync across all participants
- **Watch Parties**: Create rooms and invite friends to watch together
- **Multiple Sources**: Support for YouTube, Vimeo, local files, and more
- **Integrated Chat**: Text chat with emoji support
- **Admin Controls**: Host controls for managing the viewing experience
- **Progressive Web App**: Installable PWA with offline capabilities
- **Media Discovery**: Built-in TMDB integration for browsing content
- **User Profiles**: Customizable profiles with watch history
- **Dark Mode**: Comfortable viewing experience in any lighting
- **Keyboard Shortcuts**: Full keyboard navigation support

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16+ with React 19
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4
- **State Management**: React Context + Custom Hooks
- **Real-time Communication**: [Socket.io](https://socket.io/)
- **Database**: [Upstash Redis](https://upstash.com/) for room state
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Video Processing**: [HLS.js](https://hls.video.io/) for streaming
- **Subtitles**: WebVTT support with custom styling
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: Ready for Vercel, Docker, or traditional hosting

## 📁 Project Structure

```
astra/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API routes
│   │   ├── layout.jsx       # Root layout
│   │   └── page.jsx         # Home page
│   ├── components/          # Reusable UI components
│   ├── features/            # Feature-specific code
│   │   ├── content/         # Media browsing and display
│   │   └── room/            # Watch party functionality
│   ├── lib/                 # Utility libraries and services
│   ├── providers/           # React context providers
│   ├── utils/               # Helper functions
│   └── constants/           # Configuration constants
├── public/                  # Static assets
├── server/                  # Socket.io server
├── package.json             # Project dependencies
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- Redis instance (local or Upstash)
- TMDB API key (for media browsing)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/astra.git
   cd astra
   ```

2. Install dependencies:

   ```bash
   bun install
   # or
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration:

   ```env
   # NextAuth
   AUTH_SECRET=your_auth_secret_here

   # TMDB API
   TMDB_API_KEY=your_tmdb_api_key

   # Upstash Redis
   UPSTASH_REDIS_REST_URL=your_upstash_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

   # Socket.io Server
   WS_HTTP_URL=http://localhost:3001

   # Site URL
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. Start the development servers:

   ```bash
   bun run dev
   # or
   npm run dev
   ```

   This will start:
   - Next.js dev server on http://localhost:3000
   - Socket.io server on http://localhost:3001

## 🏗️ Building for Production

```bash
# Build the application
bun run build
# or
npm run build

# Start production server
bun run start
# or
npm run start
```

## 🔧 Configuration

Key configuration constants can be found in `src/constants/config.js`:

- Sync intervals and tolerances
- Rate limiting settings
- Storage limits
- WebSocket configuration
- Feature flags

## 📱 PWA Features

Astra includes Progressive Web App capabilities:

- Installable on mobile and desktop
- Offline caching
- Background sync
- Push notifications (coming soon)
- Manifest.json and service worker

## 🧪 Testing

```bash
# Run linting
bun run lint
# or
npm run lint
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Next.js Team](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Socket.io](https://socket.io/)
- [Upstash](https://upstash.com/)
- [TMDB API](https://www.themoviedb.org/documentation/api)
- [Lucide Icons](https://lucide.dev/)

---

Made with ❤️ for watch parties everywhere
