const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { RRC_NEXUS_SYSTEM_PROMPT } = require('./knowledge');
const { retrieveKnowledge, resolveDeterministicAnswer } = require('./retriever');

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = ['https://rrcnexus.com', 'https://www.rrcnexus.com'];

app.use(
    cors({
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type']
    })
);

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'RRC Nexus AI backend is running.'
    });
});

app.post('/api/chat', async (req, res) => {
    if (!req.is('application/json')) {
        return res.status(400).json({
            success: false,
            message: 'Request body must be JSON.',
            errorCode: 'INVALID_REQUEST'
        });
    }

    const { message } = req.body || {};

    if (typeof message !== 'string') {
        return res.status(400).json({
            success: false,
            message: message === undefined ? 'Message is required.' : 'Message must be a string.',
            errorCode: 'INVALID_REQUEST'
        });
    }

    if (!message.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Message is required.',
            errorCode: 'INVALID_REQUEST'
        });
    }

    const deterministicAnswer = resolveDeterministicAnswer(message);
    if (deterministicAnswer !== null) {
        return res.json({
            success: true,
            message: deterministicAnswer
        });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || !apiKey.trim()) {
        return res.status(503).json({
            success: false,
            message: 'The AI service is not configured. Please try again later.',
            errorCode: 'AI_NOT_CONFIGURED'
        });
    }

    try {
        const retrieved = retrieveKnowledge(message);
        const groq = new Groq({
            apiKey: apiKey.trim(),
            maxRetries: 0,
            timeout: 20000
        });
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: RRC_NEXUS_SYSTEM_PROMPT },
                { role: 'system', content: `APPROVED WEBSITE INFORMATION:\n${retrieved.context}` },
                { role: 'user', content: message.trim() }
            ],
            model: 'openai/gpt-oss-120b',
            temperature: 0
        });
        const assistantMessage = completion.choices[0]?.message?.content;

        if (typeof assistantMessage !== 'string' || !assistantMessage.trim()) {
            return res.status(502).json({
                success: false,
                message: 'The AI service returned no response. Please try again later.',
                errorCode: 'AI_SERVICE_ERROR'
            });
        }

        return res.json({
            success: true,
            message: assistantMessage
        });
    } catch (error) {
        const isTimeout = error instanceof Groq.APIConnectionTimeoutError;
        return res.status(isTimeout ? 504 : 502).json({
            success: false,
            message: 'The AI service is temporarily unavailable. Please try again later.',
            errorCode: isTimeout ? 'AI_TIMEOUT' : 'AI_SERVICE_ERROR'
        });
    }
});

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const isBadRequest = err.status === 400;
    res.status(isBadRequest ? 400 : 500).json({
        success: false,
        message: isBadRequest ? 'Request body must be valid JSON.' : 'An unexpected error occurred.',
        errorCode: isBadRequest ? 'INVALID_REQUEST' : 'INTERNAL_ERROR'
    });
});

app.listen(port, () => {
    console.log(`RRC Nexus backend listening on port ${port}.`);
});
