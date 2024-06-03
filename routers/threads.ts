import { Router } from 'express';
import setupDatabase from '../database';

const router = Router();

router.post('/create', async (req, res) => {
    const { user1_id, user2_id } = req.body;

    try {
        const db = await setupDatabase();
        const thread = await db.get('SELECT * FROM threads WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)', [user1_id, user2_id, user2_id, user1_id]);

        if (thread) {
            res.status(200).json(thread);
        } else {
            const result = await db.run('INSERT INTO threads (user1_id, user2_id) VALUES (?, ?)', [user1_id, user2_id]);
            const newThread = await db.get('SELECT * FROM threads WHERE id = ?', [result.lastID]);
            res.status(201).json(newThread);
        }
    } catch (err) {
        res.status(500).json({ error: 'Error creating thread' });
    }
});

router.post('/send', async (req, res) => {
    const { thread_id, sender_id, receiver_id, content } = req.body;

    try {
        const db = await setupDatabase();
        await db.run('INSERT INTO messages (thread_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)', [thread_id, sender_id, receiver_id, content]);
        res.status(201).json({ message: 'Message sent' });
    } catch (err) {
        res.status(500).json({ error: 'Error sending message' });
    }
});

router.get('/:thread_id/messages', async (req, res) => {
    const { thread_id } = req.params;

    try {
        const db = await setupDatabase();
        const messages = await db.all('SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp ASC', [thread_id]);
        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

export default router;
