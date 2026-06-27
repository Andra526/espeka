import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

import routes from './routes';
import { initDatabase } from './config/db';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'LecRank SAW Recommendation System API is running.' });
});

// Start Database and Server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
