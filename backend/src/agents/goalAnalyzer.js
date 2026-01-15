import { callHuggingFace } from '../config/huggingface.js';

export class GoalAnalyzerAgent {
  constructor() {
    this.name = "Goal Analyzer";
  }

  /**
   * Analyze user goal
   * @param {string} goalText
   * @returns {Promise<Object>}
   */
  async analyzeGoal(goalText) {
    try {
      const prompt = this.buildPrompt(goalText);
      const response = await callHuggingFace(prompt, {
        maxTokens: 800,
        maxRetries: 3
      });

      return this.parseResponse(response, goalText);
    } catch (error) {
      console.error('Goal analysis failed:', error);
      throw new Error(`Failed to analyze goal: ${error.message}`);
    }
  }

  /**
   * Build analysis prompt
   * @private
   */
  buildPrompt(goalText) {
    return `Analyze this goal and provide structured information in JSON format.

Goal: "${goalText}"

Please provide your analysis in the following JSON structure (respond ONLY with valid JSON, no other text):

{
  "parsedDeadline": "extracted deadline or 'not specified'",
  "subject": "main subject/topic",
  "complexity": "low/medium/high",
  "recommendedApproach": "brief recommended approach"
}

Analyze the goal carefully:
- Extract any deadline mentioned (dates, relative times like "in 2 weeks")
- Identify the main subject or topic
- Assess complexity based on scope and requirements
- Suggest a brief approach to achieve it

Respond only with the JSON object, nothing else.`;
  }

  /**
   * Parse AI response
   * @private
   */
  parseResponse(response, originalGoal) {
    try {
      // Clean response formatting
      let cleanedResponse = response?.toString?.() ? response.toString().trim() : String(response).trim();
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      cleanedResponse = cleanedResponse.trim();

      // Try to parse JSON directly first. If that fails, attempt to extract
      // the first JSON object block from the response (handles appended
      // commentary or stray text after the JSON).
      let parsed;
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (err) {
        // Attempt to extract JSON object using regex
        const match = cleanedResponse.match(/\{[\s\S]*\}/);
        if (match) {
          const candidate = match[0];
          try {
            parsed = JSON.parse(candidate);
          } catch (err2) {
            // As a last resort, trim to the last closing brace and try again
            const firstBrace = cleanedResponse.indexOf('{');
            const lastBrace = cleanedResponse.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              const sliced = cleanedResponse.slice(firstBrace, lastBrace + 1);
              parsed = JSON.parse(sliced); // may still throw
            } else {
              throw err2;
            }
          }
        } else {
          throw err;
        }
      }

      // Validate parsed output
      return {
        originalGoal,
        parsedDeadline: parsed.parsedDeadline || 'not specified',
        subject: parsed.subject || 'General task',
        complexity: this.validateComplexity(parsed.complexity),
        recommendedApproach: parsed.recommendedApproach || 'Break down into smaller tasks',
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.log('Raw response:', response);
      
      // Use fallback analysis
      return this.createFallbackAnalysis(originalGoal);
    }
  }

  /**
   * Validate complexity value
   * @private
   */
  validateComplexity(complexity) {
    const valid = ['low', 'medium', 'high'];
    const normalized = complexity?.toLowerCase();
    return valid.includes(normalized) ? normalized : 'medium';
  }

  /**
   * Generate fallback analysis
   * @private
   */
  createFallbackAnalysis(goalText) {
    // Heuristic goal analysis
    const hasDeadline = /(\d+\s*(day|week|month|year)|deadline|by\s+\w+)/i.test(goalText);
    const wordCount = goalText.split(/\s+/).length;
    
    return {
      originalGoal: goalText,
      parsedDeadline: hasDeadline ? 'deadline mentioned' : 'not specified',
      subject: goalText.substring(0, 50) + (goalText.length > 50 ? '...' : ''),
      complexity: wordCount > 20 ? 'high' : wordCount > 10 ? 'medium' : 'low',
      recommendedApproach: 'Break goal into smaller, manageable tasks and set milestones',
      analyzedAt: new Date().toISOString(),
      note: 'Fallback analysis used due to parsing error'
    };
  }

  /**
   * Format analysis output
   * @param {Object} analysis
   * @returns {string}
   */
  formatAnalysis(analysis) {
    return `
🎯 Goal Analysis Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Original Goal: ${analysis.originalGoal}

Deadline: ${analysis.parsedDeadline}
Subject: ${analysis.subject}
Complexity: ${analysis.complexity.toUpperCase()}
Recommended Approach: ${analysis.recommendedApproach}

Analyzed: ${new Date(analysis.analyzedAt).toLocaleString()}
${analysis.note ? `\n⚠️  ${analysis.note}` : ''}
    `.trim();
  }
}

export default GoalAnalyzerAgent;
