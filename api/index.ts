import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface PRDRequest {
  prd: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://www.figma.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prd } = req.body as PRDRequest;

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

    return res.status(200).json(JSON.parse(content));
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
} 