import { Router } from 'express';
import bcrypt from 'bcrypt';
import setupDatabase from '../database';
import { generateToken, verifyToken } from '../utils/auth';

const router = Router();

async function findUserByUsername(username: string) {
    const db = await setupDatabase();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    return user;
}

async function updateUserToken(userId: number, token: string) {
    const db = await setupDatabase();
    await db.run('UPDATE users SET token = ? WHERE id = ?', [token, userId]);
}

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const db = await setupDatabase();
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'User registered' });
    } catch (err) {
        res.status(500).json({ error: 'Error registering user' });
    }
});

router.get('/user_list', async (req, res) => {
    try {
        const db = await setupDatabase();
        const users = await db.all('SELECT id, username FROM users');
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching users' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password, token } = req.body;

    const user = await findUserByUsername(username);
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userToken = token || generateToken({ userId: user.id });
    await updateUserToken(user.id, userToken);

    res.cookie('userId', user.id, { sameSite: 'none', secure: true });
    res.json({ token: userToken });
});

router.post('/logout', (req, res) => {
    res.clearCookie('userId');
    res.status(200).json({ message: 'Logged out' });
});

router.get('/token', (req, res) => {
    const userId = req.cookies.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const token = generateToken({ userId });
    res.json({ token });
});

export default router;
