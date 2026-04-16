import express from 'express';
import router from './routes';
import cors from 'cors';
import { specs, swaggerUi, swaggerUiOptions } from '@src/config/swagger';
// import { CORS_URL, NODE_ENV } from './config/constants';
import path from 'path';
import errorHandler from './middleware/error.middleware';
import { fileURLToPath } from 'url';
import { timezoneMiddleware } from './middleware/timezone.middleware';

const app = express();
console.log(app.get('query parser'));

app.use(
    cors({
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    })
);
app.use(
    express.json({
        limit: '10mb',
    })
);

// Serve OpenAPI spec as JSON (for Postman import)
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(specs);
});

app.use(
    '/api/v1/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, swaggerUiOptions)
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        message: 'Server is running!',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

app.use(timezoneMiddleware);

router(app);

// Only redirect the site root to Swagger UI. Using app.use('/') matched every
// request and caused unmatched API calls to be redirected to the Swagger HTML.
app.get('/', (req, res) => {
    res.redirect('/api/v1/api-docs');
});

// Middleware 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        statusCode: 404,
    });
});

// Error handler middleware
app.use(errorHandler);

export default app;
