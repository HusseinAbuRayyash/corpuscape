# Remove uploaded assets from Git history

Hussein runs this procedure after merging the asset removal PR. The merge removes the folder from the current tree. Old commits can still contain the files until the history cleanup is complete.

1. Coordinate a pause on pushes and resolve open pull requests before starting. Save any uncommitted work you need outside the old clones, checking that it contains no private files. The force push replaces remote history, including branches and tags, and changes commit IDs.
2. In a private working directory, install `git-filter-repo` 2.47 or newer and use a fresh mirror clone. Run each command in order and check for errors before continuing.

   ```powershell
   python -m pip install --upgrade "git-filter-repo>=2.47"
   git clone --mirror https://github.com/HusseinAbuRayyash/corpuscape.git corpuscape-cleanup.git
   Set-Location corpuscape-cleanup.git
   git filter-repo --sensitive-data-removal --invert-paths --path attached_assets/
   git log --all -- attached_assets
   git ls-tree -r main -- attached_assets/
   @(Select-String -LiteralPath 'filter-repo/changed-refs' -Pattern '^refs/pull/\d+/head$').Count
   ```

   Both Git path checks should return no output. Record the affected pull request count and the first changed commit IDs reported by the tool. If any of these files previously lived at another path, include that path in the rewrite as well.
3. Review the rewritten refs before publishing. If repository rules block the force push, temporarily allow it for the cleanup and restore the protections after verifying the update. Use the explicit URL because `git-filter-repo` can remove the `origin` remote.

   ```powershell
   git push --force --mirror https://github.com/HusseinAbuRayyash/corpuscape.git
   ```

   GitHub can reject updates to its read-only `refs/pull/` refs. Resolve any other rejected updates before considering the remote rewrite complete.
4. After the force push, **delete every existing clone and replace it with a fresh clone**, including Codex's working clone and all collaborator clones. Clear automation checkout caches so jobs also use fresh clones. Keep pushes paused until the old clones are retired. A pull or merge from an old clone can put the removed files back into the repository. Reapply only reviewed work to the fresh clones.
5. Check the repository's forks and coordinate cleanup or deletion with any fork owner whose fork retains the old history. Ask [GitHub Support](https://support.github.com/) to clear eligible cached views and pull request refs. Provide the repository name, affected pull request count, first changed commit IDs, and any orphaned LFS information reported by the tool. GitHub decides whether it can assist.
6. Verify from a fresh mirror after the remote cleanup. Both checks should return no output. Also check the default branch on GitHub for the removed folder.

   ```powershell
   git clone --mirror https://github.com/HusseinAbuRayyash/corpuscape.git corpuscape-verify.git
   git -C corpuscape-verify.git log --all -- attached_assets
   git -C corpuscape-verify.git ls-tree -r main -- attached_assets/
   ```

See [GitHub's guide to removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) for the effects on pull requests, forks, and cached views.
