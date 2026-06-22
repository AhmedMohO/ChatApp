import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB database successfully.');
  } catch (err) {
    console.error('MongoDB database connection error:', err);
    process.exit(1);
  }
};
