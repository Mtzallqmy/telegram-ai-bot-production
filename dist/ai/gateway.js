"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIGateway = void 0;
const openai_1 = __importDefault(require("openai"));
const logger_1 = __importDefault(require("../utils/logger"));
class AIGateway {
    constructor(apiKey, baseURL = 'https://agentrouter.org/v1') {
        this.client = new openai_1.default({
            apiKey,
            baseURL,
        });
    }
    async chat(params) {
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
            }
            else {
                const response = await this.client.chat.completions.create({
                    model: params.model,
                    messages: params.messages,
                });
                return {
                    content: response.choices[0].message.content,
                    usage: response.usage,
                };
            }
        }
        catch (error) {
            logger_1.default.error('AI Chat Error:', error);
            throw error;
        }
    }
    async vision(params) {
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
        }
        catch (error) {
            logger_1.default.error('AI Vision Error:', error);
            throw error;
        }
    }
    async transcribe(file) {
        try {
            // Note: AgentRouter might not support transcription directly,
            // but OpenAI SDK supports it. Assuming AgentRouter has an endpoint for it.
            // If not, we'd need a fallback.
            const transcription = await this.client.audio.transcriptions.create({
                file: await openai_1.default.toFile(file, 'audio.ogg'),
                model: 'whisper-1',
            });
            return transcription.text;
        }
        catch (error) {
            logger_1.default.error('AI Transcription Error:', error);
            throw error;
        }
    }
}
exports.AIGateway = AIGateway;
//# sourceMappingURL=gateway.js.map