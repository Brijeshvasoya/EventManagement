const Groq = require("groq-sdk");

/**
 * REAL AI GENERATOR (Groq Version)
 * -------------------------------
 * Using Llama 3 for high-speed, professional content creation.
 * We initialize inside the function to prevent server crash if key is missing.
 */

exports.generateEventDescription = async (title, eventType) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || apiKey === 'your_groq_api_key') {
      return "Real AI generation requires an active GROQ_API_KEY. Please add your key to the .env file to enable this feature.";
    }

    // Initialize only when needed
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional event marketing expert. Your job is to write compelling, exciting, and professional event descriptions. Be concise but persuasive."
        },
        {
          role: "user",
          content: `Write a professional description for an event titled "${title}" which is a ${eventType}. The description should be about 150 words, mentioning what attendees can expect and why they should join. Return only the description text without any labels.`
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (aiResponse) {
      return aiResponse;
    }
  } catch (error) {
    console.error('❌ Groq AI Error:', error.message);
    return "Something went wrong with the AI service. Please try again later or add your GROQ_API_KEY.";
  }
};
exports.generateEventImagePrompt = async (title, eventType) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key') return `${title} ${eventType} professional poster`;

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert AI prompt engineer for image generation. Create highly detailed, cinematic, and artistic prompts for event posters. Do not use conversational text, only the prompt."
        },
        {
          role: "user",
          content: `Create a professional AI image generation prompt for an event titled "${title}" (${eventType}). Focus on lighting, mood, and high-quality artistic styles suitable for a modern SaaS platform. Keep it under 50 words.`
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.8,
    });

    return completion.choices[0]?.message?.content || `${title} professional poster`;
  } catch (err) {
    return `${title} professional poster`;
  }
};
