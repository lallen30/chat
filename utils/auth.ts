import jwt from 'jsonwebtoken';
import setupDatabase from '../database';
import { config } from 'dotenv';

config(); // Load environment variables

const SECRET_KEY = process.env.SECRET_KEY;

console.log('Loaded SECRET_KEY:', SECRET_KEY);

interface User {
  id: number;
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

async function verifyToken(token: string) {
  if (!SECRET_KEY) {
    throw new Error('SECRET_KEY is not defined in environment variables');
  }
  console.log(`Verifying token: ${token}`);
  console.log(`Using SECRET_KEY: ${SECRET_KEY}`);
  try {
    const decoded = jwt.verify(token, SECRET_KEY as jwt.Secret) as any;
    const db = await setupDatabase();
    const user = await db.get('SELECT * FROM users WHERE id = ? AND token = ?', [decoded.id, token]); // Use decoded.id

    if (user) {
      console.log('Token is valid. Decoded payload:', decoded);
      return decoded;
    } else {
      console.error('Token verification failed: token does not match');
      return null;
    }
  } catch (err) {
    console.error('Token verification failed:', err);
    return null;
  }
}

function validToken(token: string | null): boolean {
  console.log('Calling validToken function...');
  if (!SECRET_KEY || !token) {
    console.log('Invalid token or SECRET_KEY not defined');
    return false;
  }
  try {
    console.log(`Validating token: ${token}`);
    jwt.verify(token, SECRET_KEY as jwt.Secret);
    console.log('Token is valid');
    return true;
  } catch (err) {
    console.error('Token verification failed:', err);
    return false;
  }
}

export { generateToken, verifyToken, validToken };
