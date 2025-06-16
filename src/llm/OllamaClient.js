// src/llm/OllamaClient.js
const axios = require('axios');

class OllamaClient {
  constructor(address) {
    this.api = axios.create({
      baseURL: address,
    });
  }

  // UPDATED to support streaming
  async generate(prompt, model, onChunk) {
    try {
      const response = await this.api.post(
        "/api/generate",
        {
          model: model,
          prompt: prompt,
          stream: true, // We must enable streaming
        },
        { responseType: "stream" }
      );

      let fullResponse = "";
      for await (const chunk of response.data) {
        // Ollama streams JSON objects separated by newlines
        const chunkStr = chunk.toString();
        const jsonLines = chunkStr
          .split("\n")
          .filter((line) => line.trim() !== "");

        for (const line of jsonLines) {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            fullResponse += parsed.response;
            if (onChunk) {
              onChunk(parsed.response); // Call the callback with the new text
            }
          }
          if (parsed.done) {
            return fullResponse; // Return the complete text when done
          }
        }
      }
      return fullResponse;
    } catch (error) {
      // Handle connection errors gracefully
      if (error.response) {
        let errorData = "";
        for await (const chunk of error.response.data) {
          errorData += chunk.toString();
        }
        console.error("Error from Ollama server:", errorData);
      } else {
        console.error("Error communicating with Ollama:", error.message);
      }
      throw new Error(
        `Failed to get response from Ollama at ${this.api.defaults.baseURL}`
      );
    }
  }
}

module.exports = OllamaClient;