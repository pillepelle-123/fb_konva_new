# Contributing to freundebuch.io Application

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. **Fork and clone the repository**
```bash
git clone https://github.com/your-username/fb_konva_new.git
cd fb_konva_new
```

2. **Install dependencies**
```bash
npm run install-deps
```

3. **Set up environment variables**
```bash
cp server/.env.example server/.env
# Edit server/.env with your database credentials
```

4. **Start development servers**
```bash
npm run dev
```

## Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Keep components small and focused

## Commit Guidelines

Use conventional commit messages:
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

Example: `feat: add brush smoothing algorithm`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Test your changes thoroughly
4. Update documentation if needed
5. Submit a pull request with clear description

## Reporting Issues

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS information
- Screenshots if applicable

## Feature Requests

For new features:
- Describe the use case
- Explain the expected behavior
- Consider implementation complexity
- Discuss with maintainers first for large changes