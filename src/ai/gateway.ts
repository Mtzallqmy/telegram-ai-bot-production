import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import logger from '../utils/logger';

export class AIGateway {
  private client: OpenAI;

  constructor(apiKey: string, baseURL: string = 'https://agentrouter.org/v1') {
    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  async chat(params: {
    model: string;
    messages: any[];
    stream?: boolean;
    onStream?: (chunk: string) => void;
  }) {
    try {
      if (params.stream) {
        const stream = await this.client.chat.completions.create({
          model: params.model,
          messages: params.messages,
          stream: true,
        });

        let fullText = '';
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullText += content;
          if (params.onStream) {
            params.onStream(content);
          }
        }
        return { content: fullText, usage: null };
      } else {
        const response = await this.client.chat.completions.create({
          model: params.model,
          messages: params.messages,
        });
        return {
          content: response.choices[0].message.content,
          usage: response.usage,
        };
      }
    } catch (error) {
      logger.error('AI Chat Error:', error);
      throw error;
    }
  }

  async vision(params: { model: string; messages: any[]; imageUrl: string; prompt: string }) {
    try {
      const response = await this.client.chat.completions.create({
        model: params.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: params.prompt },
              {
                type: 'image_url',
                image_url: { url: params.imageUrl },
              },
            ],
          },
        ],
      });
      return response.choices[0].message.content;
    } catch (error) {
      logger.error('AI Vision Error:', error);
      throw error;
    }
  }

  async transcribe(file: Buffer) {
    try {
      // Note: AgentRouter might not support transcription directly,
      // but OpenAI SDK supports it. Assuming AgentRouter has an endpoint for it.
      // If not, we'd need a fallback.
      const transcription = await this.client.audio.transcriptions.create({
        file: await OpenAI.toFile(file, 'audio.ogg'),
        model: 'whisper-1',
      });
      return transcription.text;
    } catch (error) {
      logger.error('AI Transcription Error:', error);
      throw error;
    }
  }
}
