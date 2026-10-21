# Workflow

How work goes from idea to users. Issues and labels: see `issue-tracker.md` and `triage-labels.md`.

## Hard guardrail: main is production

Every push to `main` deploys to production (Fly). Work on a branch and open a PR; only northwood merges into `main` or runs the Release workflow.

## From idea to merge

1. **Scope.** Grill the idea (`grilling`), then `to-spec` writes the **parent issue** from `.github/ISSUE_TEMPLATE/feature.md`. The scoping always answers: _does this create a second source of truth, will the next feature have to undo it?_ Data-model changes get scoped before any code.
2. **Split.** `to-tickets` creates the **sub-issues** of the parent.
3. **Build.** One branch per parent issue; every sub-issue is committed on it.
4. **Review.** Run `code-review` on the branch. Fix findings now by default; a finding that waits becomes an issue with its reason, never a note buried elsewhere. Debt lives only in GitHub issues (the BMAD `deferred-work.md` was emptied into issues #30–#40 on 2026-10-22).
5. **PR.** Open one PR per parent issue, with `closes #<n>` for the parent and every sub-issue, and an `enhancement` or `bug` label (release notes are grouped by these). The PR title is the release-note line: write it for a user. northwood tests by hand; fixes land on the same branch; northwood merges.
6. **Retro.** Before closing the parent issue, comment a short retro on it (5–10 lines: what got stuck, what we change).

## Release

northwood runs **Actions → Release → Run workflow** and picks patch / minor / major. The workflow bumps the four version files, tags, publishes a GitHub release with notes generated from the merged PRs, and redeploys. `CHANGELOG.md` is a frozen archive (up to 2.1.1).

## WhatsApp announcement

On request, write the beta-tester message from everything shipped since the **last announced release**: the most recent GitHub release whose notes end with a `📣 Annoncé sur WhatsApp le DD/MM` line. Source the content from the merged PRs and their issues. Once northwood has the message, append that line to the newest release covered (`gh release edit`).
