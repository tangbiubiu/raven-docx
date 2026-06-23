import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../useAppStore";

describe("useAppStore — activeRibbonTab", () => {
  beforeEach(() => {
    useAppStore.setState({
      activeRibbonTab: "home",
      outlineWidth: 220,
      agentWidth: 380,
      outlineFloatOpen: false,
      agentFloatOpen: false,
    });
  });

  it("默认 activeRibbonTab 为 home", () => {
    expect(useAppStore.getState().activeRibbonTab).toBe("home");
  });

  it("setActiveRibbonTab 切换标签页", () => {
    useAppStore.getState().setActiveRibbonTab("insert");
    expect(useAppStore.getState().activeRibbonTab).toBe("insert");
  });
});

describe("useAppStore — 面板宽度", () => {
  beforeEach(() => {
    useAppStore.setState({ outlineWidth: 220, agentWidth: 380 });
  });

  it("setOutlineWidth 设置左栏宽度", () => {
    useAppStore.getState().setOutlineWidth(300);
    expect(useAppStore.getState().outlineWidth).toBe(300);
  });

  it("setOutlineWidth clamp 到最小值 160", () => {
    useAppStore.getState().setOutlineWidth(100);
    expect(useAppStore.getState().outlineWidth).toBe(160);
  });

  it("setOutlineWidth clamp 到最大值 400", () => {
    useAppStore.getState().setOutlineWidth(500);
    expect(useAppStore.getState().outlineWidth).toBe(400);
  });

  it("setAgentWidth clamp 到 [280, 560]", () => {
    useAppStore.getState().setAgentWidth(200);
    expect(useAppStore.getState().agentWidth).toBe(280);
    useAppStore.getState().setAgentWidth(600);
    expect(useAppStore.getState().agentWidth).toBe(560);
  });
});

describe("useAppStore — 面板弹出浮窗", () => {
  beforeEach(() => {
    useAppStore.setState({ outlineFloatOpen: false, agentFloatOpen: false });
  });

  it("setOutlineFloatOpen 打开左栏浮窗", () => {
    useAppStore.getState().setOutlineFloatOpen(true);
    expect(useAppStore.getState().outlineFloatOpen).toBe(true);
  });

  it("setAgentFloatOpen 打开右栏浮窗", () => {
    useAppStore.getState().setAgentFloatOpen(true);
    expect(useAppStore.getState().agentFloatOpen).toBe(true);
  });
});
