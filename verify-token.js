require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczpcL1wvd29yZHByZXNzLmJldGFwbGFuZXRzLmNvbSIsImlhdCI6MTcxODgxNzc4NSwibmJmIjoxNzE4ODE3Nzg1LCJleHAiOjIzNDY3NDI1ODUsImRhdGEiOnsidXNlciI6eyJpZCI6IjE0In19fQ.pbc-1KnNiKO8W_kIws_UIFsUogDoCIZb1U4y9oAA1lE';
const secretKey = process.env.SECRET_KEY;

try {
  const decoded = jwt.verify(token, secretKey);
  console.log('Token is valid. Decoded payload:', decoded);
} catch (error) {
  console.error('Token verification failed:', error);
}
