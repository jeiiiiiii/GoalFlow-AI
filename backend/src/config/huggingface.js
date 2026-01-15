import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";
dotenv.config();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

const WORKING_MODELS = [
  "meta-llama/Llama-3.2-3B-Instruct"
];

/**
 * Call Hugging Face API with automatic retry and fallback
 * @param {string} prompt - The prompt to send to the model
 * @param {Object} options - Configuration options
 * @param {string} options.model - Specific model to use (optional)
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @param {number} options.maxTokens - Maximum tokens in response (default: 500)
 * @returns {Promise<string>} - The model's response
 */
export const callHuggingFace = async (prompt, options = {}) => {
  const {
    model,
    maxRetries = 3,
    retryDelay = 1000,
    maxTokens = 500,
  } = options;

  // Use specified model or try all available models
  const modelsToTry = model ? [model] : WORKING_MODELS;
  let lastError;

  // Try each model
  for (const m of modelsToTry) {
    // Retry logic for each model
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await hf.chatCompletion({
          model: m,
          messages: [
            { role: "user", content: prompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        });

        // Successfully got a response
        return response.choices[0].message.content;
      } catch (error) {
        lastError = error;
        console.warn(`Model ${m} attempt ${attempt} failed: ${error.message}`);
        
        // Wait before retrying (except on last attempt)
        if (attempt < maxRetries) {
          await sleep(retryDelay);
        }
      }
    }
  }
  
  // All attempts failed
  throw new Error(`All models failed. Last error: ${lastError?.message}`);
};

export default { callHuggingFace };