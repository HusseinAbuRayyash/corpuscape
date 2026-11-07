declare const __APP_VERSION__: string;

declare module "mammoth/mammoth.browser" {
  export function extractRawText(options: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string }>;
}
