import express from 'express';
import { userRouter } from './routes/user.routes';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/', userRouter);

export { app };
