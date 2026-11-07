import { localModels, type ModelId } from "./report-model";
export type WriterPhase = "not-loaded" | "loading" | "ready" | "generating";
export interface WriterConnection {
  id: ModelId;
  repo: string;
  revision: string;
  runtime: string;
  contextWindow: number;
  requestedDevice: "auto" | "cpu" | "gpu";
}
export interface WriterState {
  phase: WriterPhase;
  connection: WriterConnection | null;
  progress: { loaded: number; total: number; file: string };
  notice: string;
  error: string;
}
export interface WriterResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  incomplete: boolean;
  connection: WriterConnection;
}
export interface WriterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface WriterPort {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage: (data: unknown) => void;
  terminate: () => void;
}
export const initialWriterState: WriterState = {
  phase: "not-loaded",
  connection: null,
  progress: { loaded: 0, total: 0, file: "" },
  notice: "",
  error: "",
};
type Pending<T> = {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};
export class LocalWriterClient {
  state: WriterState = {
    ...initialWriterState,
    progress: { ...initialWriterState.progress },
  };
  private port: WriterPort | null = null;
  private disposed = false;
  private loading: Pending<WriterConnection> | null = null;
  private generation:
    | (Pending<WriterResult> & {
        text: string;
        inputTokens: number;
        onDelta?: (text: string) => void;
        connection: WriterConnection;
      })
    | null = null;
  private requested: {
    id: ModelId;
    device: "auto" | "cpu" | "gpu";
    contextWindow: number;
  } | null = null;
  constructor(
    private notify: (state: WriterState) => void,
    private factory: () => WriterPort = () =>
      new Worker(new URL("./local-ai.worker.ts", import.meta.url), {
        type: "module",
      }),
  ) {}
  private update(patch: Partial<WriterState>) {
    this.state = { ...this.state, ...patch };
    if (!this.disposed) this.notify(this.state);
  }
  private release() {
    const port = this.port;
    this.port = null;
    if (port) {
      port.onmessage = null;
      port.onerror = null;
      port.terminate();
    }
  }
  private error(error: Error, fatal: boolean) {
    const load = this.loading,
      generate = this.generation;
    this.loading = null;
    this.generation = null;
    if (fatal) {
      this.release();
      this.update({
        phase: "not-loaded",
        connection: null,
        error: error.message,
      });
    } else
      this.update({
        phase: this.state.connection ? "ready" : "not-loaded",
        error: error.message,
      });
    load?.reject(error);
    generate?.reject(error);
  }
  private start() {
    const port = this.factory();
    this.port = port;
    port.onmessage = ({ data }) => {
      if (this.disposed || this.port !== port) return;
      if (data.type === "progress")
        this.update({
          progress: {
            loaded: Number(data.loaded ?? 0),
            total: Number(data.total ?? 0),
            file: String(data.file ?? ""),
          },
        });
      else if (data.type === "notice")
        this.update({ notice: String(data.message) });
      else if (data.type === "fallback") {
        if (!this.loading || !this.requested) return;
        if (data.model && localModels.some((model) => model.id === data.model))
          this.requested = { ...this.requested, id: data.model };
        this.release();
        this.update({
          notice: String(data.message),
          progress: { loaded: 0, total: 0, file: "" },
        });
        try {
          this.start().postMessage({
            type: "load",
            model: this.requested.id,
            device: "cpu",
            contextWindow: this.requested.contextWindow,
          });
        } catch (error) {
          this.error(asError(error), true);
        }
      } else if (data.type === "ready") {
        if (!this.requested || !this.loading) return;
        const model = localModels.find(
          (model) => model.id === this.requested!.id,
        )!;
        const connection: WriterConnection = {
          id: model.id,
          repo: String(data.model ?? model.repo),
          revision: String(data.revision ?? model.revision),
          runtime: String(data.device ?? "Local"),
          contextWindow: Number(
            data.contextWindow ?? this.requested.contextWindow,
          ),
          requestedDevice: this.requested.device,
        };
        const pending = this.loading;
        this.loading = null;
        this.update({ phase: "ready", connection, error: "" });
        pending.resolve(connection);
      } else if (data.type === "generating") {
        if (this.generation)
          this.generation.inputTokens = Number(data.inputTokens ?? 0);
      } else if (data.type === "delta") {
        if (!this.generation) return;
        this.generation.text += String(data.text ?? "");
        try {
          this.generation.onDelta?.(String(data.text ?? ""));
        } catch (error) {
          this.error(asError(error), true);
        }
      } else if (data.type === "done") {
        const pending = this.generation;
        if (!pending) return;
        this.generation = null;
        const result: WriterResult = {
          text: typeof data.text === "string" ? data.text : pending.text,
          inputTokens: Number(data.inputTokens ?? pending.inputTokens),
          outputTokens: Number(data.outputTokens ?? 0),
          incomplete: !!data.budgetReached,
          connection: pending.connection,
        };
        this.update({ phase: "ready", error: "" });
        pending.resolve(result);
      } else if (data.type === "error")
        this.error(
          new Error(
            String(
              data.message ?? "The local model could not complete the request.",
            ),
          ),
          !!data.fatal || !!this.loading,
        );
    };
    port.onerror = (event) => {
      if (this.port === port && !this.disposed)
        this.error(
          new Error(
            event.message ||
              "The local model worker stopped. Try a smaller model or another compute mode.",
          ),
          true,
        );
    };
    return port;
  }
  load(
    id: ModelId,
    device: "auto" | "cpu" | "gpu" = "auto",
    contextWindow = 4096,
  ): Promise<WriterConnection> {
    if (this.disposed)
      return Promise.reject(new Error("The model client has been released."));
    if (this.loading || this.generation)
      return Promise.reject(
        new Error(
          "Another model operation is running. Stop it before connecting a model.",
        ),
      );
    const connected = this.state.connection;
    if (
      connected?.id === id &&
      connected.requestedDevice === device &&
      this.requested?.contextWindow === contextWindow
    )
      return Promise.resolve(connected);
    this.release();
    this.requested = { id, device, contextWindow };
    this.update({
      phase: "loading",
      connection: null,
      progress: { loaded: 0, total: 0, file: "" },
      notice: "",
      error: "",
    });
    return new Promise((resolve, reject) => {
      this.loading = { resolve, reject };
      try {
        this.start().postMessage({
          type: "load",
          model: id,
          device,
          contextWindow,
        });
      } catch (error) {
        this.error(asError(error), true);
      }
    });
  }
  generate(
    messages: WriterMessage[],
    maxTokens: number,
    onDelta?: (text: string) => void,
  ): Promise<WriterResult> {
    if (
      this.disposed ||
      !this.port ||
      !this.state.connection ||
      this.state.phase !== "ready"
    )
      return Promise.reject(
        new Error("Connect a local model and wait for it to be ready."),
      );
    if (!Number.isSafeInteger(maxTokens) || maxTokens < 1)
      return Promise.reject(
        new Error("Choose a positive output-token budget."),
      );
    const connection = this.state.connection;
    this.update({ phase: "generating", error: "", notice: "" });
    return new Promise((resolve, reject) => {
      this.generation = {
        resolve,
        reject,
        onDelta,
        text: "",
        inputTokens: 0,
        connection,
      };
      try {
        this.port!.postMessage({ type: "generate", messages, maxTokens });
      } catch (error) {
        this.error(asError(error), true);
      }
    });
  }
  cancel(
    message = "Stopped. Partial text remains editable; cached model files can be reused.",
  ) {
    const load = this.loading,
      generate = this.generation;
    this.loading = null;
    this.generation = null;
    this.release();
    this.update({ ...initialWriterState, notice: message });
    const error = new DOMException("Model operation cancelled.", "AbortError");
    load?.reject(error);
    generate?.reject(error);
  }
  dispose() {
    this.disposed = true;
    this.cancel("");
  }
}
function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
