// utils/auth.ts
export async function signMessage(
    signMessage: (message: string) => Promise<string>,
    ownerAddress: string
): Promise<{ signature: string; message: string }> {
    const message = `Authenticate with AptSend\nAddress: ${ownerAddress}\nTimestamp: ${Date.now()}`;
    const signature = await signMessage(message);
    return { signature, message };
}