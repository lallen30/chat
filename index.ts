import dotenv from 'dotenv';
dotenv.config();

// console.log(`SECRET_KEY: ${process.env.SECRET_KEY}`);
// console.log(`COOKIE_SECRET: ${process.env.COOKIE_SECRET}`);
// console.log(`AT_KEY: ${process.env.AT_KEY}`);
// console.log(`PORT: ${process.env.PORT}`);


import express from 'express';
import cookieParser from 'cookie-parser';
import configureRoutes from './routers';
import configureSockets from './sockets';
import http from 'http';
import { COOKIE_SECRET } from './utils';
import path from 'path';

console.log(`check SECRET_KEY: ${process.env.SECRET_KEY}`);
console.log(`check PORT: ${process.env.PORT}`);

const app = express();
const port = process.env.PORT || 3107;

app.use(express.json());
app.use(cookieParser(COOKIE_SECRET)); // Ensure COOKIE_SECRET is used

// Serve static files from the 'dist' directory
const staticPath = path.join(__dirname);
console.log(`__dirname: ${__dirname}`);
console.log(`Resolved static path: ${staticPath}`);
app.use(express.static(staticPath));

configureRoutes(app, staticPath);

console.log(`Attempting to run server on port ${port}`);

const server = http.createServer(app);
configureSockets(server);

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
