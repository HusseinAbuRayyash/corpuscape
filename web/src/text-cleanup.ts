/** Explicitly requested reflow only. Blank paragraph lines and horizontal spaces are retained. */
export function joinCjkLineWraps(text: string): string {
  return text.replace(
    /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々、。，．！？「」『』（）【】《》〈〉…])[\t ]*\r?\n[\t ]*(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々、。，．！？「」『』（）【】《》〈〉…])/gu,
    "$1",
  );
}
