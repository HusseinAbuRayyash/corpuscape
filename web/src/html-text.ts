import { parse, type DefaultTreeAdapterMap } from "parse5";

/** A plain AST parser: importing a saved page never instantiates browser resources. */
export function htmlText(source: string) {
  const excluded = new Set([
    "head",
    "script",
    "style",
    "noscript",
    "template",
    "nav",
    "header",
    "footer",
    "iframe",
    "object",
    "embed",
  ]);
  const block = new Set([
    "p",
    "div",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "section",
    "article",
    "tr",
    "br",
    "hr",
    "blockquote",
    "pre",
  ]);
  const output: string[] = [];
  function visit(node: DefaultTreeAdapterMap["node"]) {
    if (node.nodeName === "#text" && "value" in node) {
      output.push(node.value);
      return;
    }
    if (
      "tagName" in node &&
      (excluded.has(node.tagName) ||
        node.attrs.some(
          (attr) =>
            attr.name === "hidden" ||
            (attr.name === "aria-hidden" && attr.value === "true"),
        ))
    )
      return;
    const name = "tagName" in node ? node.tagName : "";
    if (block.has(name)) output.push("\n");
    if ("childNodes" in node) node.childNodes.forEach(visit);
    if (name === "td" || name === "th") output.push("\t");
    else if (block.has(name)) output.push("\n");
  }
  visit(parse(source));
  return output
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
