interface ReactNativeAsset {
    file?: File;
    uri: string;
    name?: string;
    mimeType?: string;
}
interface UploadInput {
    reactNativeAsset?: ReactNativeAsset;
    file?: File;
    url?: string;
    base64?: string;
    buffer?: Buffer;
}
interface UploadResult {
    url?: string;
    mimeType?: string | null;
    error?: string;
}
interface UploadHookResult {
    loading: boolean;
}
declare function useUpload(): [(input: UploadInput) => Promise<UploadResult>, UploadHookResult];
export default useUpload;
