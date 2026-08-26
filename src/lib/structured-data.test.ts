import { describe, expect, it } from "vitest";
import { serializeStructuredData } from "@/lib/structured-data";

describe("structured data serialization", () => {
  it("does not allow CMS text to close the JSON-LD script element", () => {
    const serialized = serializeStructuredData({
      answer: "</script><script>window.compromised=true</script>",
      separator: "\u2028"
    });

    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script>");
    expect(serialized).toContain("\\u003c/script\\u003e");
    expect(serialized).toContain("\\u2028");
    expect(JSON.parse(serialized)).toEqual({
      answer: "</script><script>window.compromised=true</script>",
      separator: "\u2028"
    });
  });
});
