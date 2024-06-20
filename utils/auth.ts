import jwt from 'jsonwebtoken';  // Add this import
import setupDatabase from '../database';
import { config } from 'dotenv';

config(); // Load environment variables

const SECRET_KEY = process.env.SECRET_KEY;

console.log('Loaded SECRET_KEY:', SECRET_KEY);

interface User {
  id: number;
  token?: string;  // Make token optional
  // Add other properties if necessary
}

async function generateToken(user: User): Promise<string> {
  if (!SECRET_KEY) {
    throw new Error('SECRET_KEY is not defined in environment variables');
  }
  try {
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '5y' });
    const db = await setupDatabase(); // Ensure db is set up correctly
    await db.run(`UPDATE users SET token = ? WHERE id = ?`, [token, user.id]);
    console.log('Generated token:', token);
    return token; // Returning the token string
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
}

async function verifyToken(token: string): Promise<boolean> {
  console.log(`Verifying token: ${token}`);
  try {
    const db = await setupDatabase();
    const user = await db.get('SELECT * FROM users WHERE token = ?', [token]);
    if (user) {
      console.log('Token matches with user:', user);
      return true;
    } else {
      console.error('Token does not match any user');
      return false;
    }
  } catch (err) {
    console.error('Error verifying token:', err);
    return false;
  }
}

function validToken(token: string | null): boolean {
  console.log('Calling validToken function...');
  if (!token) {
    console.log('Invalid token');
    return false;
  }
  return true; // Temporarily consider all non-null tokens as valid
}

export { generateToken, verifyToken, validToken };
