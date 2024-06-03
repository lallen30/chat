import { Router } from 'express';
import users from '../routers/users';

const router = Router();

router.use('/users', users);

export default router;
