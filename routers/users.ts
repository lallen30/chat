import dotenv from 'dotenv';
dotenv.config();

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import setupDatabase from '../database';
import { generateToken, verifyToken } from '../utils/auth';

const router = Router();

console.log('SECRET_KEY:', process.env.SECRET_KEY);
console.log('COOKIE_SECRET:', process.env.COOKIE_SECRET);
console.log('AT_KEY:', process.env.AT_KEY);
console.log('PORT:', process.env.PORT);

async function findUserByToken(token: string) {
    const db = await setupDatabase();
    const user = await db.get('SELECT * FROM users WHERE token = ?', [token]);
    return user;
}

async function findUserByUsername(username: string) {
    const db = await setupDatabase();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    return user;
}

async function updateUserToken(userId: number, token: string) {
    const db = await setupDatabase();
    await db.run('UPDATE users SET token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [token, userId]);
}

// Wrapper to handle async errors in routes
const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => (req: Request, res: Response, next: any) => {
    fn(req, res).catch(next);
};

// Route to register a new user
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
    const { id, username, password, email, token } = req.body; // Ensure WordPress ID (id) and token are provided
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const db = await setupDatabase();
        await db.run(
            'INSERT INTO users (id, username, email, password, token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [id, username, email, hashedPassword, token]
        );
        res.status(201).json({ message: 'User registered' });
    } catch (err) {
        console.error('Error registering user:', err); // Log the error for debugging
        res.status(500).json({ error: 'Error registering user' });
    }
}));

router.post('/check_user', asyncHandler(async (req: Request, res: Response) => {
    const { id, username, email, token } = req.body;

    if (!id || !username || !email || !token) {
        return res.status(400).json({ error: 'Missing required fields: id, username, email, or token' });
    }

    try {
        const db = await setupDatabase();

        // Check if the user already exists
        const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);

        if (existingUser) {
            // Update only the fields that don't match
            const updates = [];
            const params = [];

            if (existingUser.username !== username) {
                updates.push('username = ?');
                params.push(username);
            }
            if (existingUser.email !== email) {
                updates.push('email = ?');
                params.push(email);
            }
            if (existingUser.token !== token) {
                updates.push('token = ?');
                params.push(token);
            }

            if (updates.length > 0) {
                const query = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                params.push(id);

                console.log(`Updating user with ID ${id} with query: ${query} and params: ${params}`);
                await db.run(query, params);
            }
            res.status(200).json({ message: 'User updated' });
        } else {
            // Insert a new user
            const insertQuery = 'INSERT INTO users (id, username, email, token, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
            const insertParams = [id, username, email, token];

            console.log(`Inserting new user with query: ${insertQuery} and params: ${insertParams}`);
            await db.run(insertQuery, insertParams);
            res.status(201).json({ message: 'User registered' });
        }
    } catch (err) {
        console.error('Error checking/registering user:', err); // Log the error for debugging
        res.status(500).json({ error: 'Error checking/registering user' });
    }
}));

// Route to connect a user based on the token
router.post('/connect', asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    try {
        const user = await findUserByToken(token);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(200).json({ message: 'Connection established', user });
    } catch (err) {
        console.error('Error connecting user:', err);
        res.status(500).json({ error: 'Error connecting user' });
    }
}));

// Route to get user list
router.get('/user_list', asyncHandler(async (req: Request, res: Response) => {
    try {
        const db = await setupDatabase();
        const users = await db.all('SELECT id, username FROM users');
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching users' });
    }
}));

// Route to log in a user
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
    const { username, password, token } = req.body;

    const user = await findUserByUsername(username);
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userToken = token || await generateToken({ id: user.id });

    await updateUserToken(user.id, userToken);

    res.cookie('userId', user.id, { sameSite: 'lax', secure: false });
    res.json({ token: userToken, userId: user.id });
}));

// Route to log out a user
router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('userId');
    res.status(200).json({ message: 'Logged out' });
});

// Route to generate a new token
router.get('/token', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.cookies.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    generateToken({ id: userId }).then(token => {
        res.json({ token });
    }).catch(err => {
        res.status(500).json({ error: 'Error generating token' });
    });
}));

export default router;
