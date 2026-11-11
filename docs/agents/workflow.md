# Workflow

How work goes from idea to users. Issues and labels: see `issue-tracker.md` and `triage-labels.md`.

## Hard guardrail: main is production

Every push to `main` deploys to production (Fly), and merging a labelled PR also ships a release. Work on a branch and open a PR; only northwood merges into `main` or runs the Release workflow by hand.

## From idea to merge

1. **Scope.** Grill the idea (`grilling`), then `to-spec` writes the **parent issue** from `.github/ISSUE_TEMPLATE/feature.md`. The scoping always answers: _does this create a second source of truth, will the next feature have to undo it?_ Data-model changes get scoped before any code.
2. **Split.** `to-tickets` creates the **sub-issues** of the parent.
3. **Build.** One branch per parent issue; every sub-issue is committed on it. The pre-commit hook (lint + tests, front then back) saves its last run to `.git/pre-commit-last.log` and, on failure, ends with the failing tests' names. A test that fails then passes on rerun is a flake: reopen #21 with its name and that log, never just retry.
4. **Review.** Run `code-review` on the branch. Fix findings now by default; a finding that waits becomes an issue with its reason, never a note buried elsewhere. Debt lives only in GitHub issues (the BMAD `deferred-work.md` was emptied into issues #30–#40 on 2026-10-22).
5. **PR.** Open one PR per parent issue, with `closes #<n>` for the parent and every sub-issue, and the label that gives the release type (see **Release**; release notes are grouped by these). The PR title is the release-note line: write it for a user. northwood tests by hand; fixes land on the same branch; northwood merges.
6. **Retro.** Before closing the parent issue, comment a short retro on it (5–10 lines: what got stuck, what we change).

## Release

Merging a PR into `main` starts the release. Its label gives the version, and the highest one wins:

| Label | Version |
| --- | --- |
| `major` | Major |
| `enhancement` | Minor |
| `bug` | Patch |
| None of these | No version, only the merge's deploy |

Only propose `major` when northwood asks for a major version: a mistake ships it at merge.

The workflow bumps the version in the root package (the only place it lives), tags, publishes a GitHub release with notes generated from the merged PRs, and deploys. `CHANGELOG.md` is a frozen archive (up to 2.1.1).

**Green** means production serves the deployed version: right after `flyctl deploy`, the Deploy job reads the site's `/version.json` and compares it with the `package.json` it deployed (#66). The check knows versions, not builds: a merge without a release label keeps the version, so its deploy passes even if the old machine still answers. Only a version bump is really proven.

**Not green:** look at which job and which step stopped.

- **Deploy failed:** re-run the failed job alone. That retries the deploy without creating another version.
- **Version check failed** (the step after `flyctl deploy`, log line `expected X, served Y`): production still answers with another version when the script gives up. Look at `served`: an older version means the new machine never took over (check `flyctl status` and the machine logs, then re-run the job); `no version (...)` means the site didn't answer or answered without a `version.json`. Nothing is rolled back automatically.
- **Deploy cancelled:** a merge replaced the release's waiting deploy, and production still gets the version. Check that merge's deploy instead.
- **Release failed:** read its log before re-running, because a re-run bumps again. It is safe if the bump never reached `main`, for example when a merge landed just before the push. If the bump is already on `main`, re-running would skip a version: create the missing release by hand instead.

**Fallback:** **Actions → Release → Run workflow**, picking patch / minor / major, if the automatic start doesn't fire or an unlabelled PR should still get a version.

## WhatsApp announcement

Announce minor and major releases, never patch-only ones. On request, write the beta-tester message from everything shipped since the **last announced release**: the most recent GitHub release whose notes end with a `📣 Annoncé sur WhatsApp le DD/MM` line. Source the content from the merged PRs and their issues. Once northwood has the message, append that line to the newest release covered (`gh release edit`).
