/**
 * Nachbildung der DOM-Helfer, die Obsidian global bereitstellt (createEl,
 * createDiv, createSpan, appendText, instanceOf, activeDocument …), für Tests
 * (jsdom) und den CodeMirror-Testaufbau. Im Plugin liefert Obsidian die echten
 * Implementierungen; diese Datei wird nicht mitgebaut.
 */

interface ElInfo {
  cls?: string | string[];
  text?: string;
  attr?: Record<string, string | number | boolean | null>;
  href?: string;
  prepend?: boolean;
}

function applyInfo(el: HTMLElement, info: ElInfo | string | undefined): HTMLElement {
  if (typeof info === "string") info = { cls: info };
  if (!info) return el;
  if (info.cls) el.classList.add(...(Array.isArray(info.cls) ? info.cls : info.cls.split(" ").filter(Boolean)));
  if (info.text !== undefined) el.textContent = info.text;
  if (info.href !== undefined) el.setAttribute("href", info.href);
  for (const [k, v] of Object.entries(info.attr ?? {})) {
    if (v !== null && v !== false) el.setAttribute(k, String(v));
  }
  return el;
}

export function installObsidianDomHelpers(win: Window & typeof globalThis = window): void {
  const proto = win.HTMLElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto.createEl === "function") return;

  function createEl(this: HTMLElement | undefined, tag: string, info?: ElInfo | string): HTMLElement {
    const parent = this instanceof win.HTMLElement ? this : undefined;
    const doc = parent?.ownerDocument ?? win.document;
    const el = applyInfo(doc.createElement(tag), info);
    if (parent) {
      const prepend = typeof info === "object" && info?.prepend;
      if (prepend) parent.insertBefore(el, parent.firstChild);
      else parent.appendChild(el);
    }
    return el;
  }

  proto.createEl = createEl;
  proto.createDiv = function (this: HTMLElement, info?: ElInfo | string) {
    return createEl.call(this, "div", info);
  };
  proto.createSpan = function (this: HTMLElement, info?: ElInfo | string) {
    return createEl.call(this, "span", info);
  };
  proto.appendText = function (this: HTMLElement, text: string) {
    this.appendChild(this.ownerDocument.createTextNode(text));
  };
  proto.empty = function (this: HTMLElement) {
    this.replaceChildren();
  };
  proto.toggleClass = function (this: HTMLElement, cls: string, value: boolean) {
    this.classList.toggle(cls, value);
  };
  proto.addClass = function (this: HTMLElement, ...cls: string[]) {
    this.classList.add(...cls);
  };
  (win.Node.prototype as unknown as Record<string, unknown>).instanceOf = function (
    this: Node,
    type: abstract new (...args: never[]) => unknown,
  ) {
    return this instanceof type;
  };

  const g = win as unknown as Record<string, unknown>;
  g.createEl = (tag: string, info?: ElInfo | string) => createEl.call(undefined, tag, info);
  g.createDiv = (info?: ElInfo | string) => createEl.call(undefined, "div", info);
  g.createSpan = (info?: ElInfo | string) => createEl.call(undefined, "span", info);
  g.activeDocument = win.document;
  g.activeWindow = win;
}

// In Testumgebungen mit DOM (jsdom) automatisch installieren.
if (typeof window !== "undefined") installObsidianDomHelpers();
