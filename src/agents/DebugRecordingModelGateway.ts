import { DebugContentRecorder } from "../events/debug/DebugContentRecorder.js";
import type { IModelGateway } from "../models/contracts/IModelGateway.js";
import type { IScopedDebugRecorder } from "../events/debug/IScopedDebugRecorder.js";
import type { ModelRequest } from "../agentic/model/ModelRequest.js";
import type { ModelReply } from "../agentic/model/ModelReply.js";
import type { ModelCallControl } from "../agentic/model/ModelCallControl.js";

/** Traces each model call: its duration, reply status, model and token usage. */
export class DebugRecordingModelGateway implements IModelGateway {
  constructor(private readonly gateway: IModelGateway, private readonly debug: IScopedDebugRecorder) {}
  generate(request: ModelRequest, control: ModelCallControl): Promise<ModelReply> {
    return this.debug.operation("model.call", async () => {
      new DebugContentRecorder(this.debug).record("request", request);
      const reply = await this.gateway.generate(request, control);
      new DebugContentRecorder(this.debug).record("reply", reply);
      this.debug.event("progress.reported", reply.status === "completed" ? "debug" : "warn", {
        operation: "model.reply",
        nextState: reply.status,
        ...(reply.usage ? { count: reply.usage.outputTokens } : {}),
        relatedRefs: [
          `model:${reply.providerId}/${reply.modelId}`,
          ...(reply.usage ? [`inputTokens:${reply.usage.inputTokens}`, `outputTokens:${reply.usage.outputTokens}`] : []),
          ...(reply.usage?.cachedInputTokens ? [`cachedInputTokens:${reply.usage.cachedInputTokens}`] : []),
          ...(reply.usage?.reasoningTokens ? [`reasoningTokens:${reply.usage.reasoningTokens}`] : []),
          ...(reply.errorCode ? [`error:${reply.errorCode}`] : []),
        ],
      });
      return reply;
    }, { count: request.messages.length, relatedRefs: [`operation:${control.operationId}`, `messages:${request.messages.length}`] });
  }
}
