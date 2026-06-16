"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
function useUpload() {
    const [loading, setLoading] = react_1.default.useState(false);
    const upload = react_1.default.useCallback(async (input) => {
        try {
            setLoading(true);
            let response;
            if ('reactNativeAsset' in input && input.reactNativeAsset) {
                if (input.reactNativeAsset.file) {
                    const formData = new FormData();
                    formData.append('file', input.reactNativeAsset.file);
                    response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData,
                    });
                }
                else {
                    const presignResponse = await fetch('/api/upload/presign', {
                        method: 'POST',
                    });
                    const { secureSignature: _secureSignature, secureExpire: _secureExpire } = await presignResponse.json();
                    // Note: The client import is missing in the original file
                    // This would need to be imported from @uploadcare/upload-client
                    // const result = await client.uploadFile(input.reactNativeAsset, {
                    // 	fileName:
                    // 		input.reactNativeAsset.name ??
                    // 		input.reactNativeAsset.uri.split('/').pop(),
                    // 	contentType: input.reactNativeAsset.mimeType,
                    // 	secureSignature,
                    // 	secureExpire,
                    // });
                    // return {
                    // 	url: `${process.env.NEXT_PUBLIC_BASE_CREATE_USER_CONTENT_URL}/${result.uuid}/`,
                    // 	mimeType: result.mimeType || null,
                    // };
                    throw new Error('Upload client not configured');
                }
            }
            else if ('file' in input && input.file) {
                const formData = new FormData();
                formData.append('file', input.file);
                response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
            }
            else if ('url' in input) {
                response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ url: input.url }),
                });
            }
            else if ('base64' in input) {
                response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ base64: input.base64 }),
                });
            }
            else {
                response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                    },
                    body: input.buffer,
                });
            }
            if (!response.ok) {
                if (response.status === 413) {
                    throw new Error('Upload failed: File too large.');
                }
                throw new Error('Upload failed');
            }
            const data = await response.json();
            return { url: data.url, mimeType: data.mimeType || null };
        }
        catch (uploadError) {
            if (uploadError instanceof Error) {
                return { error: uploadError.message };
            }
            if (typeof uploadError === 'string') {
                return { error: uploadError };
            }
            return { error: 'Upload failed' };
        }
        finally {
            setLoading(false);
        }
    }, []);
    return [upload, { loading }];
}
exports.default = useUpload;
//# sourceMappingURL=useUpload.js.map