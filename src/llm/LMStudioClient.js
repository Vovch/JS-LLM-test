// src/llm/LMStudioClient.js
const { OpenAI } = require('openai');

class LMStudioClient {
  constructor(address, apiKey) {
    this.openai = new OpenAI({
      baseURL: address,
      apiKey: apiKey || 'lm-studio',
    });
  }

  // UPDATED to support streaming
  async generate(prompt, model, onChunk) {
    try {
      const stream = await this.openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: model,
        temperature: 0.1,
        stream: true, // Enable streaming
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          if (onChunk) {
            onChunk(content); // Call the callback with the new text
          }
        }
      }
      return fullResponse;

    } catch (error) {
      console.error('Error communicating with LM Studio:', error.message);
      throw new Error(`Failed to get response from LM Studio at ${this.openai.baseURL}`);
    }
  }
}

module.exports = LMStudioClient;