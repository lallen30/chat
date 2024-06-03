import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { resolve } from 'path';
import { COOKIE_SECRET } from '../utils';
import api from './api';
import cors from 'cors';

function configureRoutes(app: express.Application, baseDir: string) {
    app
        .use(cors())
        .get('/', (req: Request, res: Response, next: NextFunction) => {
            const indexPath = resolve(baseDir, 'index.html');
            console.log(`Resolved path for index.html: ${indexPath}`);
            res.sendFile(indexPath, (err) => {
                if (err) {
                    console.error(`Error serving index.html from ${indexPath}:`, err.message);
                    next(err);
                }
            });
        })
        .use(express.static(resolve(baseDir, 'public')))
        .use(bodyParser.json())
        .use(cookieParser(COOKIE_SECRET))
        .use('/api', api())
        .use('/error', (req: Request, res: Response, next: NextFunction) => {
            console.log('Error route hit');
            next(new Error('Other Error'));
        })
        .use((req: Request, res: Response, next: NextFunction) => {
            console.log(`Route not found: ${req.url}`);
            next(new Error('Not Found'));
        });

    // Error handling middleware
    app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
        console.error('Error encountered:', error.message);
        let errorPath: string;
        switch (error.message) {
            case 'Not Found':
                errorPath = resolve(baseDir, 'notfound.html');
                console.log(`Resolved path for notfound.html: ${errorPath}`);
                res.sendFile(errorPath, (err) => {
                    if (err) {
                        console.error(`Error serving notfound.html from ${errorPath}:`, err.message);
                        res.status(500).send('Internal Server Error');
                    }
                });
                return;
        }

        errorPath = resolve(baseDir, 'error.html');
        console.log(`Resolved path for error.html: ${errorPath}`);
        res.sendFile(errorPath, (err) => {
            if (err) {
                console.error(`Error serving error.html from ${errorPath}:`, err.message);
                res.status(500).send('Internal Server Error');
            }
        });
    });
}

export default configureRoutes;
