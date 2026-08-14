// raven-docx/officecli.test.ts — OfficeCLI runner + rels 规范化单元测试
// Reference: .dev/plan/wps-benchmark/officecli-m2-spec.md §5(rels 规范化)

import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";
import { normalizeRels, runOfficeCliBatch } from "./officecli";

/** 构造内存 docx(含若干 .rels part,可注入非标准 Target) */
function makeDocx(rels: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<?xml version='1.0'?><Types/>");
  zip.file("word/document.xml", "<w:document/>");
  for (const [name, content] of Object.entries(rels)) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

async function readPart(buffer: ArrayBuffer, name: string): Promise<string> {
  const z = await JSZip.loadAsync(buffer);
  return z.file(name)?.async("string") ?? "";
}

describe("normalizeRels", () => {
  it("去前导斜杠:/media/image.png → media/image.png", async () => {
    const buffer = await makeDocx({
      "word/_rels/document.xml.rels":
        '<Relationships><Relationship Target="/media/image.png"/></Relationships>',
    });
    const out = await normalizeRels(buffer);
    const rels = await readPart(out, "word/_rels/document.xml.rels");
    expect(rels).toContain('Target="media/image.png"');
    expect(rels).not.toContain('Target="/media/image.png"');
    // 原始 buffer 不应被改动
    const original = await readPart(buffer, "word/_rels/document.xml.rels");
    expect(original).toContain('Target="/media/image.png"');
  });

  it("去 /word/ 前缀(仅 word/_rels):/word/styles.xml → styles.xml", async () => {
    const buffer = await makeDocx({
      "word/_rels/document.xml.rels":
        '<Relationships><Relationship Target="/word/styles.xml"/></Relationships>',
    });
    const out = await normalizeRels(buffer);
    const rels = await readPart(out, "word/_rels/document.xml.rels");
    expect(rels).toContain('Target="styles.xml"');
  });

  it("根 _rels/.rels 保留 word/ 前缀:/word/document.xml → word/document.xml", async () => {
    const buffer = await makeDocx({
      "_rels/.rels":
        '<Relationships><Relationship Target="/word/document.xml"/></Relationships>',
    });
    const out = await normalizeRels(buffer);
    const root = await readPart(out, "_rels/.rels");
    expect(root).toContain('Target="word/document.xml"');
    expect(root).not.toContain('Target="/word/document.xml"');
  });

  it("多 part 全部规范化", async () => {
    const buffer = await makeDocx({
      "word/_rels/document.xml.rels":
        '<Relationships><Relationship Target="/media/a.png"/><Relationship Target="/word/theme/theme1.xml"/></Relationships>',
    });
    const out = await normalizeRels(buffer);
    const doc = await readPart(out, "word/_rels/document.xml.rels");
    expect(doc).toContain('Target="media/a.png"');
    expect(doc).toContain('Target="theme/theme1.xml"');
  });

  it("无非法 Target 时原样返回同一 buffer(不重打包)", async () => {
    const buffer = await makeDocx({
      "word/_rels/document.xml.rels":
        '<Relationships><Relationship Target="media/image.png"/></Relationships>',
    });
    const out = await normalizeRels(buffer);
    expect(out).toBe(buffer);
  });

  it("保留其他 part 内容不变", async () => {
    const buffer = await makeDocx({
      "word/_rels/document.xml.rels":
        '<Relationships><Relationship Target="/media/image.png"/></Relationships>',
    });
    const out = await normalizeRels(buffer);
    expect(await readPart(out, "word/document.xml")).toBe("<w:document/>");
  });
});

describe("runOfficeCliBatch", () => {
  afterEach(() => {
    process.env.RAVEN_OFFICECLI_BIN = "";
  });

  it("RAVEN_OFFICECLI_BIN 未设置时返回明确错误", () => {
    process.env.RAVEN_OFFICECLI_BIN = "";
    const r = runOfficeCliBatch("/tmp/x.docx", []);
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("officecli 未安装");
  });

  it("参数数组不经 shell(无 shell 注入面)", () => {
    process.env.RAVEN_OFFICECLI_BIN = "/nonexistent/officecli";
    // 含 shell 元字符的参数必须原样传递,绝不能拼进 shell
    const r = runOfficeCliBatch("/tmp/x.docx", [
      {
        command: "add",
        parent: "/",
        type: "field",
        props: { formula: "$(rm -rf /)" },
      },
    ]);
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("officecli 执行失败");
  });
});
