// stores/__tests__/useAgentStore.test.ts — Agent 会话状态 Store 单元测试
// Reference: .dev/docs/modules/stores.md §3

import { beforeEach, describe, expect, it } from "vitest";
import { createMessage, useAgentStore } from "../useAgentStore";

describe("useAgentStore", () => {
  beforeEach(() => {
    useAgentStore.getState().reset();
  });

  describe("初始状态", () => {
    it("status 初始为 disconnected", () => {
      expect(useAgentStore.getState().status).toBe("disconnected");
    });

    it("messages 初始为空数组", () => {
      expect(useAgentStore.getState().messages).toEqual([]);
    });

    it("error 初始为 null", () => {
      expect(useAgentStore.getState().error).toBeNull();
    });

    it("contextBadge 初始为 null", () => {
      expect(useAgentStore.getState().contextBadge).toBeNull();
    });

    it("currentStreamingId 初始为 null", () => {
      expect(useAgentStore.getState().currentStreamingId).toBeNull();
    });
  });

  describe("setStatus", () => {
    it.each([
      "disconnected" as const,
      "connecting" as const,
      "ready" as const,
      "busy" as const,
      "error" as const,
    ])("设置 status 为 %s", (status) => {
      useAgentStore.getState().setStatus(status);
      expect(useAgentStore.getState().status).toBe(status);
    });
  });

  describe("setError", () => {
    it("设置错误信息", () => {
      useAgentStore.getState().setError("连接超时");
      expect(useAgentStore.getState().error).toBe("连接超时");
    });

    it("设置 error 后 status 变为 error", () => {
      useAgentStore.getState().setStatus("ready");
      useAgentStore.getState().setError("something went wrong");
      expect(useAgentStore.getState().status).toBe("error");
    });

    it("清除错误", () => {
      useAgentStore.getState().setError("连接超时");
      useAgentStore.getState().setError(null);
      expect(useAgentStore.getState().error).toBeNull();
    });
  });

  describe("消息管理", () => {
    it("addMessage 添加消息到列表末尾", () => {
      const msg = createMessage("user", "Hello");
      useAgentStore.getState().addMessage(msg);

      const messages = useAgentStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Hello");
    });

    it("addMessage 支持多条消息", () => {
      useAgentStore.getState().addMessage(createMessage("user", "Hi"));
      useAgentStore.getState().addMessage(createMessage("agent", "Hello!"));
      expect(useAgentStore.getState().messages).toHaveLength(2);
    });

    it("updateMessage 追加流式内容", () => {
      const msg = createMessage("agent", "", true);
      useAgentStore.getState().addMessage(msg);

      useAgentStore.getState().updateMessage(msg.id, "Hel");
      useAgentStore.getState().updateMessage(msg.id, "Hello");

      const updated = useAgentStore.getState().messages[0];
      expect(updated.content).toBe("Hello");
    });

    it("updateMessage 不影响其他消息", () => {
      const msg1 = createMessage("user", "Hi");
      const msg2 = createMessage("agent", "", true);
      useAgentStore.getState().addMessage(msg1);
      useAgentStore.getState().addMessage(msg2);

      useAgentStore.getState().updateMessage(msg2.id, "Hello!");

      expect(useAgentStore.getState().messages[0].content).toBe("Hi");
      expect(useAgentStore.getState().messages[1].content).toBe("Hello!");
    });

    it("finishStreaming 标记流式完成", () => {
      const msg = createMessage("agent", "partial", true);
      useAgentStore.getState().addMessage(msg);

      useAgentStore.getState().finishStreaming(msg.id);

      const finished = useAgentStore.getState().messages[0];
      expect(finished.isStreaming).toBe(false);
      expect(useAgentStore.getState().currentStreamingId).toBeNull();
    });

    it("clearMessages 清空消息列表", () => {
      useAgentStore.getState().addMessage(createMessage("user", "Hi"));
      useAgentStore.getState().addMessage(createMessage("agent", "Hello"));

      useAgentStore.getState().clearMessages();

      expect(useAgentStore.getState().messages).toEqual([]);
      expect(useAgentStore.getState().currentStreamingId).toBeNull();
    });
  });

  describe("流式消息完整流程", () => {
    it("模拟 sendMessage → text_delta → agent_end 流程", () => {
      const store = useAgentStore.getState();

      // 1. 用户发送消息
      store.addMessage(createMessage("user", "润色这段文字"));
      store.setStatus("busy");

      // 2. Agent 开始回复（流式）
      const agentMsg = createMessage("agent", "", true);
      store.addMessage(agentMsg);

      // 3. 流式增量更新
      store.updateMessage(agentMsg.id, "好的");
      store.updateMessage(agentMsg.id, "好的，我来");
      store.updateMessage(agentMsg.id, "好的，我来帮你润色这段文字。");

      // 4. 流式完成
      store.finishStreaming(agentMsg.id);
      store.setStatus("ready");

      const state = useAgentStore.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].role).toBe("user");
      expect(state.messages[1].role).toBe("agent");
      expect(state.messages[1].content).toBe("好的，我来帮你润色这段文字。");
      expect(state.messages[1].isStreaming).toBe(false);
      expect(state.status).toBe("ready");
      expect(state.currentStreamingId).toBeNull();
    });
  });

  describe("上下文徽章", () => {
    it("setContextBadge 设置上下文徽章", () => {
      useAgentStore
        .getState()
        .setContextBadge({ text: "光标: §4.2", type: "cursor" });
      expect(useAgentStore.getState().contextBadge).toEqual({
        text: "光标: §4.2",
        type: "cursor",
      });
    });

    it("setContextBadge 可设为 null", () => {
      useAgentStore
        .getState()
        .setContextBadge({ text: "光标: §4.2", type: "cursor" });
      useAgentStore.getState().setContextBadge(null);
      expect(useAgentStore.getState().contextBadge).toBeNull();
    });
  });

  describe("reset", () => {
    it("重置所有状态到初始值", () => {
      const store = useAgentStore.getState();
      store.setStatus("ready");
      store.setError("test error");
      store.addMessage(createMessage("user", "Hi"));
      store.setContextBadge({ text: "光标: §1", type: "cursor" });

      store.reset();

      const state = useAgentStore.getState();
      expect(state.status).toBe("disconnected");
      expect(state.error).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.contextBadge).toBeNull();
      expect(state.currentStreamingId).toBeNull();
    });
  });

  describe("createMessage", () => {
    it("创建用户消息", () => {
      const msg = createMessage("user", "Hello");
      expect(msg.role).toBe("user");
      expect(msg.content).toBe("Hello");
      expect(msg.isStreaming).toBe(false);
      expect(msg.id).toBeTruthy();
      expect(msg.timestamp).toBeGreaterThan(0);
    });

    it("创建流式消息", () => {
      const msg = createMessage("agent", "", true);
      expect(msg.role).toBe("agent");
      expect(msg.isStreaming).toBe(true);
    });

    it("每条消息 ID 唯一", () => {
      const msg1 = createMessage("user", "A");
      const msg2 = createMessage("user", "B");
      expect(msg1.id).not.toBe(msg2.id);
    });
  });
});
