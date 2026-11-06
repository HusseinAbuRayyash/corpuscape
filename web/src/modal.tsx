import React, { useEffect, useRef } from "react";

export function Modal({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const backdrop = ref.current?.parentElement;
    const siblings = [...(backdrop?.parentElement?.children ?? [])].filter(
      (node) => node !== backdrop,
    ) as HTMLElement[];
    const old = siblings.map((node) => node.inert);
    siblings.forEach((node) => {
      node.inert = true;
    });
    ref.current?.focus();
    return () => {
      siblings.forEach((node, i) => {
        node.inert = old[i];
      });
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <section
      ref={ref}
      className="modal panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
        if (event.key !== "Tab") return;
        const nodes = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ) ?? []),
        ];
        const first = nodes[0],
          last = nodes.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      {children}
    </section>
  );
}
