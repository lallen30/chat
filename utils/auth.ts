import jwt from 'jsonwebtoken';
import setupDatabase from '../database';

const SECRET_KEY = process.env.SECRET_KEY;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const AT_KEY = process.env.AT_KEY;

function generateToken(payload: any): string {
  if (!SECRET_KEY) {
    throw new Error('SECRET_KEY is not defined in environment variables');
  }
  return jwt.sign(payload, SECRET_KEY as jwt.Secret, { expiresIn: '1h' });
}

async function verifyToken(token: string) {
  if (!SECRET_KEY) {
    throw new Error('SECRET_KEY is not defined in environment variables');
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY as jwt.Secret) as any;
    const db = await setupDatabase();
    const user = await db.get('SELECT * FROM users WHERE id = ? AND token = ?', [decoded.userId, token]);

    if (user) {
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
  if (!SECRET_KEY || !token) {
    return false;
  }
  try {
    jwt.verify(token, SECRET_KEY as jwt.Secret);
    return true;
  } catch (err) {
    console.error('Token verification failed:', err);
    return false;
  }
}

export { generateToken, verifyToken, validToken };
