# Releasing

Releases are driven by Conventional Commits.

1. [release-please](https://github.com/googleapis/release-please) keeps a
   "chore(main): release x.y.z" PR open on `main`. It updates `CHANGELOG.md`
   and the version in `package.json`, `src-tauri/Cargo.toml` and
   `src-tauri/tauri.conf.json`.
2. Merging that PR creates the tag and the GitHub Release.
3. The `Release` workflow then builds a universal macOS app with
   `tauri-action` and attaches the `.dmg` to the release.

## Signing secrets (optional)

If these repository secrets are set, the build is signed and notarized.
If they are missing, the build is unsigned and still succeeds.

| Secret | Meaning |
|---|---|
| `APPLE_CERTIFICATE` | Base64 of the Developer ID Application `.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | Password of the `.p12` |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Name (TEAMID)` |
| `APPLE_ID` | Apple ID used for notarization |
| `APPLE_PASSWORD` | App-specific password for that Apple ID |
| `APPLE_TEAM_ID` | Apple Developer team ID |

Note: `release-please` needs "Allow GitHub Actions to create and approve pull
requests" enabled in the repository's Actions settings.
