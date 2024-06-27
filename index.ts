import dotenv from 'dotenv';
dotenv.config();

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

// Serve static files from the 'public' directory
const staticPath = path.join(__dirname, 'public');
console.log(`__dirname: ${__dirname}`);
console.log(`Resolved static path: ${staticPath}`);
app.use(express.static(staticPath));

// Use the configured routes
configureRoutes(app, __dirname);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});

console.log(`Attempting to run server on port ${port}`);

const server = http.createServer(app);
configureSockets(server);

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
