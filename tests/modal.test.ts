import test from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { Modal } from "../web/src/modal";

test("modal focuses the dialog, confines Tab, closes on Escape and restores background focus", async () => {
  const dom = new JSDOM(
    '<button id="opener">Open</button><div id="root"></div>',
  );
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const opener = document.getElementById("opener")!;
  opener.focus();
  const root = createRoot(document.getElementById("root")!);
  let closed = false;
  await act(async () =>
    root.render(
      React.createElement(
        "div",
        null,
        React.createElement("main", { id: "background" }, "Background"),
        React.createElement(
          "div",
          { className: "modal-backdrop" },
          React.createElement(
            Modal,
            {
              labelledBy: "title",
              onClose: () => {
                closed = true;
              },
            },
            React.createElement("h2", { id: "title" }, "Import"),
            React.createElement("button", { id: "first" }, "First"),
            React.createElement("button", { id: "last" }, "Last"),
          ),
        ),
      ),
    ),
  );
  assert.equal(document.activeElement!.getAttribute("role"), "dialog");
  assert.equal(
    (document.getElementById("background") as HTMLElement).inert,
    true,
  );
  const dialog = document.querySelector('[role="dialog"]')!;
  await act(async () => {
    dialog.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );
  });
  assert.equal(document.activeElement!.id, "first");
  await act(async () => {
    document
      .getElementById("first")!
      .dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
        }),
      );
  });
  assert.equal(document.activeElement!.id, "last");
  await act(async () => {
    document
      .getElementById("last")!
      .dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
        }),
      );
  });
  assert.equal(closed, true);
  await act(async () => root.unmount());
  assert.equal(document.activeElement, opener);
});
