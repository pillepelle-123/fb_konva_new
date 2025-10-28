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
│   ├── uploads/            # File upload directory
│   └── package.json
├── package.json            # Root package.json with scripts
└── README.md
```

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