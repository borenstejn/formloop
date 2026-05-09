"use client";

import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "a", "b", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "i", "img", "li", "ol", "p", "pre", "small", "span", "strong", "sub",
  "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
  "svg", "g", "path", "circle", "rect", "line", "polyline", "polygon", "text",
  "ellipse", "defs", "linearGradient", "radialGradient", "stop", "use",
  "symbol", "title", "desc", "section", "article", "header", "footer", "nav",
  "figure", "figcaption", "blockquote", "cite", "kbd", "samp", "var", "abbr",
  "time", "mark", "del", "ins", "s",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "class", "id", "style",
  "width", "height", "viewBox", "fill", "stroke", "stroke-width",
  "stroke-linecap", "stroke-linejoin", "d", "x", "y", "x1", "y1", "x2", "y2",
  "cx", "cy", "r", "rx", "ry", "points", "transform", "opacity",
  "stop-color", "stop-opacity", "offset", "gradientUnits", "preserveAspectRatio",
  "xmlns", "fill-opacity", "stroke-opacity", "data-id", "data-label",
  "data-value", "target", "rel", "loading",
];

export function HtmlSafe({
  html,
  className,
  style,
}: {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
  });
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
