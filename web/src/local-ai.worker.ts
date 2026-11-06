import {
  pipeline,
  env,
  TextStreamer,
  InterruptableStoppingCriteria,
  type TextGenerationPipeline,
} from "@huggingface/transformers";
import { localModels, type ModelId } from "./report-model";
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm!.numThreads = 1;
if (import.meta.env.PROD)
  env.backends.onnx.wasm!.wasmPaths = new URL(
    "../ai-runtime/",
    import.meta.url,
  ).href;
let generator: TextGenerationPipeline | null = null;
let loadedKey = "",
  busy = false;
const stop = new InterruptableStoppingCriteria();
const progressFiles = new Map<string, { loaded: number; total: number }>();
async function load(id: ModelId, device: "auto" | "gpu" | "cpu") {
  const model = localModels.find((model) => model.id === id);
  if (!model) throw new Error("Choose a model from the model library.");
  const key = `${id}/${device}`;
  if (generator && loadedKey === key) return;
  await generator?.dispose();
  generator = null;
  progressFiles.clear();
  const gpuNavigator = navigator as Navigator & {
    gpu?: {
      requestAdapter: () => Promise<{
        features: { has: (name: string) => boolean };
      } | null>;
    };
  };
  const adapter =
    device !== "cpu" ? await gpuNavigator.gpu?.requestAdapter() : undefined;
  let gpu = !!adapter?.features.has("shader-f16");
  if (device === "gpu" && !gpu)
    throw new Error(
      "This browser cannot provide a compatible WebGPU adapter. Choose CPU / compatibility mode.",
    );
  const progress = (data: Record<string, unknown>) => {
    if (data.status === "progress" && typeof data.file === "string")
      progressFiles.set(data.file, {
        loaded: Number(data.loaded ?? 0),
        total: Number(data.total ?? 0),
      });
    const files = [...progressFiles.values()];
    self.postMessage({
      type: "progress",
      status: data.status,
      file: data.file,
      loaded: files.reduce((sum, f) => sum + f.loaded, 0),
      total: files.reduce((sum, f) => sum + f.total, 0),
    });
  };
  const create = (onGpu: boolean) =>
    pipeline("text-generation", model.repo, {
      device: onGpu ? "webgpu" : "wasm",
      dtype: model.id === "smol" ? "q8" : onGpu ? "q4f16" : "q8",
      progress_callback: progress,
    });
  try {
    generator = await create(gpu);
  } catch (error) {
    if (!gpu || device === "gpu") throw error;
    self.postMessage({
      type: "fallback",
      model: id,
      message:
        "GPU initialization failed. Releasing that worker and loading CPU-compatible weights; you can cancel at any time.",
    });
    return;
  }
  loadedKey = key;
  self.postMessage({
    type: "ready",
    model: model.repo,
    device: gpu ? "WebGPU" : "CPU / WASM",
  });
}
self.onmessage = async ({ data }) => {
  if (data.type === "stop") {
    stop.interrupt();
    return;
  }
  if (busy) {
    self.postMessage({
      type: "error",
      message: "A model operation is already running.",
    });
    return;
  }
  busy = true;
  try {
    if (data.type === "load") await load(data.model, data.device);
    else if (data.type === "generate") {
      if (!generator)
        throw new Error("Load a local model before generating a draft.");
      stop.reset();
      const chatOptions = {
        tokenize: false as const,
        add_generation_prompt: true,
        enable_thinking: false,
      };
      const prompt = generator.tokenizer.apply_chat_template(
        data.messages,
        chatOptions,
      ) as string;
      const tokenized = generator.tokenizer(prompt);
      const inputTokens = Number(tokenized.input_ids.dims.at(-1));
      const max = Number(data.maxTokens);
      const contextWindow = Number(
        generator.model.config.max_position_embeddings ?? 32768,
      );
      if (
        !Number.isSafeInteger(max) ||
        max < 1 ||
        max + inputTokens > contextWindow
      )
        throw new Error(
          `This model has a ${contextWindow.toLocaleString()}-token context. The selected evidence uses ${inputTokens} tokens. Reduce evidence rows or requested draft length; nothing has been silently removed.`,
        );
      self.postMessage({ type: "generating", inputTokens });
      const generationOptions = {
        return_full_text: false,
        max_new_tokens: max,
        do_sample: false,
        repetition_penalty: 1.1,
        stopping_criteria: stop,
        streamer: new TextStreamer(generator.tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (text: string) =>
            self.postMessage({ type: "delta", text }),
        }),
      };
      const result = await generator(prompt, generationOptions);
      const text =
        (result as { generated_text: string }[])[0]?.generated_text ?? "";
      self.postMessage({
        type: "done",
        text,
        inputTokens,
        outputTokens: generator.tokenizer(text).input_ids.dims.at(-1),
        model: loadedKey,
        budgetReached:
          Number(generator.tokenizer(text).input_ids.dims.at(-1)) >= max,
      });
    } else if (data.type === "unload") {
      await generator?.dispose();
      generator = null;
      loadedKey = "";
      self.postMessage({ type: "unloaded" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: "error",
      fatal:
        data.type === "load" ||
        /Aborted|out.of.memory|memory access|allocation/i.test(message),
      message: /Aborted|out.of.memory|memory access|allocation/i.test(message)
        ? "This device could not initialize or run the selected model. Release it and try a smaller model or another compute mode. Exact statistical reports remain available."
        : message,
    });
  } finally {
    busy = false;
  }
};
