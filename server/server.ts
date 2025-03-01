import express, { Request, Response } from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.MAX_REQUESTS_PER_HOUR || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://www.figma.com').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(limiter);

interface PRDRequest {
  prd: string;
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// Endpoint to analyze PRD
app.post('/analyze-prd', async (req: Request<{}, {}, PRDRequest>, res: Response) => {
  try {
    const { prd } = req.body;

    if (!prd) {
      return res.status(400).json({ error: 'PRD is required' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a UI/UX expert that analyzes PRDs and converts them into structured component requirements.
          Return a JSON object with the following structure:
          {
            "components": [
              {
                "type": "component-name",
                "properties": {
                  "width": "number",
                  "height": "number",
                  // other properties
                }
              }
            ],
            "layout": {
              "columns": number,
              "spacing": number
            }
          }`
        },
        {
          role: "user",
          content: `Analyze this PRD and return a JSON object with required components and layout information: ${prd}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    res.json(JSON.parse(content));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 