import { Fragment } from "react";
import type { UnmatchedNumber } from "./report-model";
import "./draft-number-review.css";

export function DraftNumberReview({
  text,
  findings,
}: {
  text: string;
  findings: UnmatchedNumber[];
}) {
  if (!findings.length) return null;
  return (
    <div className="draft-number-review">
      <p className="research-notice" role="status">
        Check highlighted numbers against your results.
      </p>
      <details open>
        <summary>Review draft numbers</summary>
        <div className="draft-number-preview" dir="auto">
          {findings.map(({ start, end }, index) => (
            <Fragment key={start}>
              {text.slice(findings[index - 1]?.end ?? 0, start)}
              <mark>{text.slice(start, end)}</mark>
            </Fragment>
          ))}
          {text.slice(findings[findings.length - 1].end)}
        </div>
      </details>
    </div>
  );
}
