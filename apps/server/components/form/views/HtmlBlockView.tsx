"use client";

import { HtmlSafe } from "../HtmlSafe";

export function HtmlBlockView({ html }: { html: string }) {
  return (
    <HtmlSafe
      html={html}
      className="tf-html-block"
      style={{ width: "100%" }}
    />
  );
}
