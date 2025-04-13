# HN Reader

A modern Hacker News reader web application built with React, TypeScript, and Vite.

## Features

- Browse top Hacker News stories with clean UI
- View story details and nested comments
- Pagination support for browsing more stories
- Dark/light mode theme toggle with persistent preferences
- Responsive design for mobile and desktop

## Tech Stack

- **Frontend**: React 19, TypeScript, React Router 7
- **API**: Hacker News API (Firebase)
- **Build Tool**: Vite
- **Styling**: CSS with dark/light mode support
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hn-top-threads2.git
cd hn-top-threads2

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

### Build for Production

```bash
# Build the app
npm run build

# Preview the production build
npm run preview
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Structure

- `/src` - Application source code
  - `/api` - API client for Hacker News
  - `/components` - React components
  - `/hooks` - Custom React hooks
  - `/types` - TypeScript type definitions

## License

MIT