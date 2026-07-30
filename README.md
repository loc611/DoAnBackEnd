# Student Management System

A full-stack student management application featuring a React/Vite frontend and an Express/MongoDB backend.

## Project Structure

The project has been bundled into two main directories:

- `frontend/`: The React application using Vite and Tailwind CSS.
- `backend/`: The Express API server using MongoDB.

## Getting Started

1. **Install dependencies for all projects**:
   In the root directory, run:
   ```bash
   npm run install:all
   ```

2. **Environment Variables**:
   Ensure you have a `.env` file in the `backend/` directory with `MONGO_URI` and any other required variables.

3. **Start the application**:
   To run both frontend and backend concurrently in development mode, run:
   ```bash
   npm run dev
   ```

   Alternatively, you can run them separately:
   - Frontend: `npm run dev:frontend`
   - Backend: `npm run dev:backend`
