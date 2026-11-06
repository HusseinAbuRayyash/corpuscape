import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const git = (args, cwd = root) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
if (!existsSync(join(root, "dist/index.html")))
  throw new Error("Run npm run build first.");
if (git(["status", "--porcelain"]))
  throw new Error("Commit the reviewed source before publishing.");
const remote = git(["remote", "get-url", "origin"]);
if (
  !/^https:\/\/github\.com\/HusseinAbuRayyash\/corpuscape(?:\.git)?$/.test(
    remote,
  )
)
  throw new Error("Verify the target repository before publishing.");
const checkout = mkdtempSync(join(tmpdir(), "corpuscape-pages-"));
git(["init", "--initial-branch=gh-pages"], checkout);
git(["remote", "add", "origin", remote], checkout);
const prior = git(["ls-remote", "origin", "refs/heads/gh-pages"]);
if (prior) {
  git(["fetch", "--depth=1", "origin", "gh-pages"], checkout);
  git(["reset", "--hard", "FETCH_HEAD"], checkout);
}
const customDomain = existsSync(join(checkout, "CNAME"))
  ? readFileSync(join(checkout, "CNAME"), "utf8")
  : null;
for (const entry of readdirSync(checkout)) {
  if (entry === ".git") continue;
  const target = resolve(checkout, entry);
  if (!target.startsWith(resolve(checkout) + sep))
    throw new Error("Unsafe publishing path.");
  rmSync(target, { recursive: true, force: true });
}
cpSync(join(root, "dist"), checkout, { recursive: true });
if (customDomain) writeFileSync(join(checkout, "CNAME"), customDomain);
writeFileSync(join(checkout, ".nojekyll"), "");
writeFileSync(
  join(checkout, "source-revision.txt"),
  git(["rev-parse", "HEAD"]) + "\n",
);
const username = git(["config", "user.name"]) || "Corpuscape";
const email =
  git(["config", "user.email"]) ||
  "149263186+HusseinAbuRayyash@users.noreply.github.com";
git(["config", "user.name", username], checkout);
git(["config", "user.email", email], checkout);
git(["add", "--all"], checkout);
if (!git(["status", "--porcelain"], checkout)) {
  console.log("Published files already match.");
  process.exit(0);
}
git(["commit", "-m", "Publish Corpuscape browser edition"], checkout);
console.log(git(["push", "origin", "HEAD:gh-pages"], checkout));
console.log(
  "Published static files to gh-pages. Check GitHub Pages deployment status.",
);
