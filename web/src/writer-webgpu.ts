export async function supportsWriterWebGpu(): Promise<boolean> {
  const { gpu } = navigator as Navigator & {
    gpu?: {
      requestAdapter(): Promise<{ features: ReadonlySet<string> } | null>;
    };
  };
  try {
    const adapter = await gpu?.requestAdapter();
    return adapter?.features.has("shader-f16") ?? false;
  } catch {
    return false;
  }
}
