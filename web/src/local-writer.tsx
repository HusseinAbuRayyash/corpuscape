import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  LocalWriterClient,
  initialWriterState,
  type WriterState,
} from "./writer-client";
import { localModels, type ModelId } from "./report-model";
import { supportsWriterWebGpu } from "./writer-webgpu";

const selectableModels = localModels.filter(({ id }) => id !== "qwen-large");
const Context = createContext<{
  client: LocalWriterClient;
  state: WriterState;
} | null>(null);
export function LocalWriterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState(initialWriterState);
  const [client] = useState(() => new LocalWriterClient(setState));
  useEffect(() => () => client.dispose(), [client]);
  return (
    <Context.Provider value={{ client, state }}>{children}</Context.Provider>
  );
}
export function useLocalWriter() {
  const value = useContext(Context);
  if (!value) throw new Error("Local writer provider is missing.");
  return value;
}
export function ModelConnection() {
  const { client, state } = useLocalWriter();
  const [model, setModel] = useState<ModelId>("mlc-qwen"),
    [webGpu, setWebGpu] = useState<boolean | null>(null),
    [device, setDevice] = useState<"auto" | "cpu" | "gpu">("auto"),
    [context, setContext] = useState(4096),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const busy = state.phase !== "not-loaded",
    info = localModels.find((m) => m.id === model)!;
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    try {
      const settings = JSON.parse(
        localStorage.getItem("writer-settings-v1") ?? "null",
      );
      if (settings && selectableModels.some((m) => m.id === settings.model)) {
        setModel(settings.model);
        setDevice(
          ["auto", "cpu", "gpu"].includes(settings.device)
            ? settings.device
            : "auto",
        );
        setContext(
          Number.isSafeInteger(settings.context) &&
            settings.context > 0 &&
            settings.context <= 32768
            ? settings.context
            : 4096,
        );
      }
    } catch {
      /* Defaults work without storage. */
    }
    let active = true;
    void supportsWriterWebGpu().then((available) => {
      if (!active) return;
      setWebGpu(available);
      if (!available) {
        setModel("qwen-small");
        setDevice("cpu");
      }
    });
    return () => { active = false; };
  }, []);
  async function connect() {
    if (webGpu === null || (!webGpu && (model === "mlc-qwen" || device === "gpu"))) return;
    setError("");
    setMessage("");
    try {
      try {
        localStorage.setItem(
          "writer-settings-v1",
          JSON.stringify({ model, device, context }),
        );
      } catch {}
      await client.load(model, device, context);
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setError(String((e as Error).message));
    }
  }
  return (
    <div className="model-connection-panel">
      <h2>Local AI connection</h2>
      <p className="research-muted">
        Open models run on this device. First use downloads weights; corpus text
        and prompts stay here. The connection is shared by Reports and Mini
        paper.
      </p>
      {state.connection ? (
        <div className="model-connected">
          <div>
            <strong>Model connected</strong>
            <small>
              {state.connection.repo} · {state.connection.runtime} ·{" "}
              {state.connection.contextWindow.toLocaleString()} context tokens
            </small>
          </div>
        </div>
      ) : (
        <>
          <label>
            Open model
            <select
              disabled={busy || webGpu === null}
              value={model}
              aria-describedby={webGpu === false ? "writer-webgpu-reason" : undefined}
              onChange={(e) => {
                setModel(e.target.value as ModelId);
                if (e.target.value === "mlc-qwen" && device === "cpu")
                  setDevice("auto");
              }}
            >
              {selectableModels.map((m) => (
                <option key={m.id} value={m.id} disabled={m.id === "mlc-qwen" && webGpu !== true}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {webGpu === false && (
            <p className="research-muted" id="writer-webgpu-reason">
              Qwen2.5 1.5B requires WebGPU with float16 support. Your browser or device does not provide it.
            </p>
          )}
          <div className="model-spec">
            <strong>{info.detail}</strong>
            <span>
              About{" "}
              {(device === "gpu" ? info.gpuMB : info.cpuMB).toLocaleString()} MB
              download + runtime · {info.license}
            </span>
            <a
              href={`https://huggingface.co/${info.repo}`}
              target="_blank"
              rel="noreferrer"
            >
              Model card ↗
            </a>
          </div>
          <label>
            Compute mode
            <select
              disabled={busy || webGpu === null}
              value={device}
              onChange={(e) => setDevice(e.target.value as typeof device)}
            >
              <option value="auto">
                Automatic
                {model === "mlc-qwen"
                  ? " · GPU with compact CPU fallback"
                  : " · GPU with CPU fallback"}
              </option>
              <option disabled={webGpu !== true} value="gpu">WebGPU</option>
              <option disabled={model === "mlc-qwen"} value="cpu">
                CPU / WASM
              </option>
            </select>
          </label>
          {model === "mlc-qwen" && (
            <label>
              Context window tokens
              <input
                type="number"
                min="1"
                max="32768"
                disabled={busy}
                value={context}
                onChange={(e) => setContext(Number(e.target.value))}
              />
              <small>
                4,096 needs about 1.6 GB GPU memory. Larger contexts need more
                memory.
              </small>
            </label>
          )}
        </>
      )}
      {state.phase === "not-loaded" ? (
        <button className="research-button primary full" disabled={webGpu === null} onClick={connect}>
          Download & connect model
        </button>
      ) : (
        <button
          className="research-button full"
          onClick={() => client.cancel()}
        >
          {state.phase === "loading"
            ? "Cancel download"
            : state.phase === "generating"
              ? "Stop generation"
              : "Disconnect & release memory"}
        </button>
      )}
      {state.phase === "loading" && (
        <div className="model-progress" role="status">
          <strong>Connecting model…</strong>
          {state.progress.total > 0 && (
            <progress
              value={state.progress.loaded}
              max={state.progress.total}
            />
          )}
          <small>{state.progress.file}</small>
        </div>
      )}
      {(error || state.error) && (
        <p className="research-error" role="alert">
          {error || state.error}
        </p>
      )}
      {message && (
        <p className="research-notice" role="status">
          {message}
        </p>
      )}
      {state.notice && (
        <p className="research-notice" role="status">
          {state.notice}
        </p>
      )}
      {state.phase === "not-loaded" && (
        <button
          className="research-text-button"
          onClick={async () => {
            try {
              await (
                await import("./local-model-cache")
              ).clearLocalModelCaches();
              setMessage("Downloaded model cache cleared.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Clear downloaded model cache
        </button>
      )}
    </div>
  );
}
