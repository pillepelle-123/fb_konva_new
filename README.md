# dein-freundebuch.de Full-Stack Application

A full-stack web application with React frontend and Node.js/Express backend for creating interactive canvas-based content with drawing tools, text editing, and image management.

## Features

### Canvas Editor
- **Drawing Tools**: Brush, line, circle, rectangle with rough.js sketchy styling
- **Text Elements**: Regular text, questions, and answers with inline editing
- **Image Management**: Image placeholders with upload functionality
- **Selection & Transformation**: Multi-select, resize, rotate, and group movement
- **Vector Graphics**: True vector-based shapes with infinite scalability

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Intuitive Toolbar**: Easy-to-use tool selection
- **Real-time Preview**: Live brush preview while drawing
- **Professional UX**: Smooth interactions and visual feedback

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** (build tool and dev server)
- **React Router** (client-side routing)
- **Konva.js** (2D canvas library)
- **Rough.js** (hand-drawn style graphics)
- **Tailwind CSS** (utility-first styling)

### Backend
- **Node.js** with Express
- **PostgreSQL** with pg (node-postgres)
- **JWT Authentication** (jsonwebtoken)
- **Password Hashing** (bcryptjs)
- **File Upload** (multer)
- **CORS** middleware
- **Puppeteer** (PDF generation from HTML/Canvas)

### Shared Code
- **TypeScript/JavaScript** - Platform-independent utilities
- **Shared Rendering Logic** - Consistent rendering between client and server

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd fb_konva_new
```

2. **Install dependencies**
```bash
npm run install-deps
```

3. **Configure environment variables**
   - Copy `server/.env.example` to `server/.env`
   - Update database connection string
   - Set a secure JWT secret
   - (Optional) Set `UPLOADS_DIR` if you want to use a custom upload directory path

4. **Start development servers**
```bash
npm run dev
```

This will start:
- React frontend on http://localhost:5173
- Express backend on http://localhost:5000

### Individual Commands

- **Server only**: `npm run server`
- **Client only**: `npm run client`
- **Install all deps**: `npm run install-deps`

## Project Structure

```
fb_konva_new/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # React context providers
│   │   ├── pages/          # Page components
│   │   └── types/          # TypeScript type definitions
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # Express backend
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   ├── services/           # Business logic (PDF export, etc.)
│   ├── utils/              # Utility functions (uploads-path, etc.)
│   └── package.json
├── uploads/                # File upload directory (root level)
│   ├── profile_pictures/   # User profile pictures
│   ├── images/             # User-uploaded images
│   ├── background-images/  # Background images (admin uploads)
│   ├── stickers/           # Stickers (admin uploads)
│   └── pdf-exports/        # Generated PDF files
├── shared/                 # Platform-independent shared code
│   ├── data/               # Shared data (themes, palettes)
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Shared utilities (text-layout, qna-layout)
│   └── rendering/          # Shared rendering logic (server-side PDF export)
├── docs/                   # Documentation
│   ├── architecture/       # Architecture documentation
│   ├── migration/          # Migration documentation
│   └── testing/            # Testing documentation
├── package.json            # Root package.json with scripts
└── README.md
```

## Upload Directory Structure

All uploaded files are stored in `[root]/uploads/` (or the path specified in `UPLOADS_DIR` environment variable).

### Directory Structure

```
uploads/
├── profile_pictures/       # User profile pictures (organized by userId)
│   └── {userId}/
├── images/                 # User-uploaded images (organized by userId)
│   └── {userId}/
├── background-images/      # Background images (admin uploads, organized by category)
│   └── {category}/
├── stickers/               # Stickers (admin uploads, organized by category)
│   └── {category}/
├── pdf-exports/            # Generated PDF files (organized by bookId)
│   └── {bookId}/
└── app/                    # App-specific assets (logos, icons, etc.)
```

### Configuration

- **UPLOADS_DIR**: Environment variable to specify custom upload directory path
  - If not set, defaults to `[root]/uploads/`
  - All uploads will be stored relative to this directory
  - Example: `UPLOADS_DIR=/var/www/uploads`

### URL Access

All files are publicly accessible via `/uploads/{subdirectory}/...` URLs. For example:
- Profile pictures: `/uploads/profile_pictures/{userId}/{filename}`
- Background images: `/uploads/background-images/{category}/{filename}`

### Migration

If you have existing files in `server/uploads/`, use the migration script:

```bash
node server/scripts/migrate-uploads.js
```

This script will move all files from `server/uploads/` to `[root]/uploads/` (or `UPLOADS_DIR`).

## Architecture

### Shared Utilities

Die Anwendung verwendet plattformunabhängige shared Utilities für konsistentes Rendering zwischen Client und Server:

- **Text Layout:** `shared/utils/text-layout.ts` - Text-Layout-Berechnungen
- **QnA Layout:** `shared/utils/qna-layout.ts` - QnA-Layout-Berechnungen
- **Themes & Palettes:** `shared/data/templates/` - Zentralisierte Theme- und Palette-Definitionen
- **Rendering Logic:** Primary PDF rendering uses the client React bundle (served to Puppeteer). The historical server-side `shared/rendering/` fallback has been removed and is no longer used.

**Weitere Informationen:** Siehe `docs/architecture/shared-utilities.md`

## Documentation

- **Architecture:** `docs/architecture/shared-utilities.md` - Shared Utilities Architecture
- **Migration:** `docs/migration/` - Migration documentation and status
- **Testing:** `docs/testing/` - Testing documentation and guides

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### File Upload
- `POST /api/upload` - Upload images (requires authentication)

## Development

### Adding New Tools
1. Create tool component in `client/src/components/Editor/`
2. Add tool to toolbar in `Toolbar.tsx`
3. Handle tool logic in `Canvas.tsx`
4. Update `EditorContext.tsx` if needed

### Database Schema
The application uses PostgreSQL with tables for:
- Users (authentication)
- Books (canvas projects)
- Pages (individual canvas pages)
- Elements (canvas objects)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Konva.js** for the powerful 2D canvas library
- **Rough.js** for the hand-drawn aesthetic
- **React** team for the excellent framework
- **Vite** for the fast development experience