import OpenAI from 'openai';
export declare class AIGateway {
    private client;
    constructor(apiKey: string, baseURL?: string);
    chat(params: {
        model: string;
        messages: any[];
        stream?: boolean;
        onStream?: (chunk: string) => void;
    }): Promise<{
        content: string;
        usage: null;
    } | {
        content: string | null;
        usage: OpenAI.Completions.CompletionUsage | undefined;
    }>;
    vision(params: {
        model: string;
        messages: any[];
        imageUrl: string;
        prompt: string;
    }): Promise<string | null>;
    transcribe(file: Buffer): Promise<string>;
}
