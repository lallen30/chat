import setupDatabase from '../database';
import { generateToken, verifyToken, validToken } from './auth';

const COOKIE_SECRET = process.env.COOKIE_SECRET;
const AT_KEY = process.env.AT_KEY;

export { generateToken, verifyToken, validToken, setupDatabase, COOKIE_SECRET, AT_KEY };
