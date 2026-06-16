interface UseHandleStreamResponseProps {
    onChunk: (content: string) => void;
    onFinish: (content: string) => void;
}
declare function useHandleStreamResponse({ onChunk, onFinish }: UseHandleStreamResponseProps): any;
export default useHandleStreamResponse;
