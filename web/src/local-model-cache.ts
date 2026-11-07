import { localModels } from "./report-model";
export async function clearLocalModelCaches() {
  if (!("caches" in globalThis))
    throw new Error("Cache management is unavailable in this browser.");
  await caches.delete("transformers-cache");
  const { deleteModelAllInfoInCache, prebuiltAppConfig } = await import(
    "@mlc-ai/web-llm"
  );
  const entry = prebuiltAppConfig.model_list.find(
    (model) => model.model_id === "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  );
  const model = localModels.find((model) => model.id === "mlc-qwen")!;
  if (entry)
    await deleteModelAllInfoInCache(entry.model_id, {
      ...prebuiltAppConfig,
      model_list: [
        {
          ...entry,
          model: `https://huggingface.co/${model.repo}/resolve/${model.revision}/`,
        },
      ],
    });
}
