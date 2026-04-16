import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({
        path: `.env.${process.env.NODE_ENV || 'development'}`,
    });
}

import { createServer } from 'http';
import prisma from '@src/config/prisma';
import app from './app';
import { PORT, BACKEND_URL } from './config/constants';
import { initializeSocketIO } from './config/socket';
import { startScheduleJobs } from '@src/jobs/scheduleJobs';

// Tạo HTTP server từ Express app
const httpServer = createServer(app);

// Khởi tạo Socket.IO
initializeSocketIO(httpServer);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

startScheduleJobs();

httpServer.listen(PORT, () => {
    console.log(`Server is running on at ${BACKEND_URL}:${PORT}`);
    console.log(`Swagger docs at ${BACKEND_URL}:${PORT}/api/v1/api-docs`);
    console.log(`Health check at available at ${BACKEND_URL}:${PORT}/`);
    console.log(`Socket.IO ready for connections`);
});
