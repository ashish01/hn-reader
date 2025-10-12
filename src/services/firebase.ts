import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Initialize Firebase with HN's database URL
const app = initializeApp({
  databaseURL: 'https://hacker-news.firebaseio.com'
});

// Export the database instance
export const db = getDatabase(app);
