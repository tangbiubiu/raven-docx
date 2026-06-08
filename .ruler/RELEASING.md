# Releasing

This document describes the automated release workflow for building and distributing the application.

<!--
## Template Repository Only: npm Publishing

This section applies only to the template repository (create-tauri-react-app).
It is automatically removed when users run the setup script.

### npm Package

The template is published to npm to support `bun create tauri-react-app` and `npm create tauri-react-app`.

### Trusted Publishing Setup

This repository uses npm trusted publishing with OIDC - no secrets required!

To set up trusted publishing for the package:
1. Go to https://www.npmjs.com and navigate to the package settings
2. Find the "Trusted Publisher" section
3. Select "GitHub Actions" as the provider
4. Configure:
   - **Organization or user**: `somus`
   - **Repository**: `create-tauri-react-app`
   - **Workflow filename**: `publish.yml`

The workflow has the required `id-token: write` permission configured for OIDC authentication.

### How It Works

The `publish-npm` job in `.github/workflows/publish.yml` runs after release-please creates a release.
It uses the `--provenance` flag with npm publish to authenticate via OIDC (no NPM_TOKEN secret needed).
Provenance attestations are automatically generated.

This job is automatically removed when users run `bun run setup` because the
`generatePublishWorkflow()` function regenerates the workflow without the npm job.
-->

## Overview

The release system uses a single GitHub Actions workflow (`publish.yml`) that handles both release management and building:

```
Push commits to main
        │
        ▼
┌───────────────────────────────┐
│  Job: release-please          │
│                               │
│  Analyzes commits and either: │
│  • Creates/updates Release PR │
│    (if releasable changes)    │
│  OR                           │
│  • Creates tag + GitHub       │
│    Release (when PR merged)   │
│                               │
│  Output: release_created,     │
│          tag_name             │
└───────────────┬───────────────┘
                │
        release_created?
                │
        ┌───────┴───────┐
        │               │
       true           false
        │               │
        ▼               ▼
┌───────────────┐   (workflow ends,
│ Job: publish- │    no builds)
│ npm           │
│ (template     │
│  repo only)   │
└───────┬───────┘
        │
        ▼
┌───────────────────────────────┐
│  Job: publish-tauri           │
│  (parallel builds)            │
│                               │
│  • macOS ARM64 & Intel        │
│  • Windows x64                │
│  • Linux x64                  │
│                               │
│  Uploads to GitHub Release:   │
│  • Platform binaries          │
│  • Auto-updater JSON          │
└───────────────────────────────┘
```

The `publish-npm` job only exists in the template repository and is removed when users run the setup script.

## Prerequisites

Before your first release, complete these setup steps:

### 1. Generate Updater Keypair

The auto-updater requires a keypair to sign updates. Generate one:

```bash
bun tauri signer generate -w ~/.tauri/myapp.key
```

This creates:
- `~/.tauri/myapp.key` - Private key (keep secret!)
- `~/.tauri/myapp.key.pub` - Public key

### 2. Configure tauri.conf.json

Update `src-tauri/tauri.conf.json` with your public key and GitHub repository:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "PASTE_YOUR_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/latest.json"
      ]
    }
  }
}
```

Replace:
- `YOUR_USERNAME` with your GitHub username or organization
- `YOUR_REPO` with your repository name
- `PASTE_YOUR_PUBLIC_KEY_HERE` with the contents of `~/.tauri/myapp.key.pub`

### 3. Add GitHub Secrets

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

#### Required for Updater Signing

| Secret | Description |
|--------|-------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/myapp.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password used when generating the key |

#### Optional: macOS Code Signing & Notarization

By default, macOS code signing is **disabled**. Unsigned apps will show a security warning when users first open them (users can bypass this via Right-click > Open).

To enable signed and notarized macOS builds:

1. **Add the following secrets** to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the .p12 certificate |
| `APPLE_SIGNING_IDENTITY` | e.g., "Developer ID Application: Your Name (TEAMID)" |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_PASSWORD` | App-specific password (generate at appleid.apple.com) |
| `APPLE_TEAM_ID` | Your 10-character Team ID |

2. **Uncomment the macOS signing environment variables** in `.github/workflows/publish.yml`:

```yaml
# Change this:
# APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
# APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
# ...

# To this:
APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
APPLE_ID: ${{ secrets.APPLE_ID }}
APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

To export your certificate as base64:
```bash
base64 -i Certificates.p12 | pbcopy
```

#### Optional: Windows Code Signing

For signed Windows builds, you'll need an EV code signing certificate. The process varies by certificate provider.

## Making a Release

### Automatic Release (Recommended)

1. **Make changes and commit using conventional commits:**
   ```bash
   git commit -m "feat: add dark mode support"
   git commit -m "fix: resolve crash on startup"
   git push origin main
   ```

2. **Review the Release PR:**
   - release-please automatically creates a PR titled "chore(main): release X.Y.Z"
   - The PR includes version bumps and CHANGELOG updates
   - Review and merge when ready

3. **Review and publish the draft release:**
   - After merging, the publish workflow builds all platforms
   - Go to GitHub Releases and find the draft release
   - Review the assets and publish

### Manual Release

If you need to release without going through the Release PR:

```bash
# Create and push a tag
git tag v1.2.3
git push origin v1.2.3
```

This triggers the publish workflow directly.

## Conventional Commits

release-please uses conventional commits to determine version bumps:

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `fix:` | Patch (0.0.X) | `fix: resolve memory leak` |
| `feat:` | Minor (0.X.0) | `feat: add export feature` |
| `feat!:` or `BREAKING CHANGE:` | Major (X.0.0) | `feat!: new API` |

Other types (`docs`, `chore`, `test`, `ci`, `style`, `refactor`, `perf`, `build`) don't trigger releases but are included in the changelog.

## Build Artifacts

Each release includes the following artifacts:

| Platform | Artifacts |
|----------|-----------|
| **macOS ARM64** | `.dmg`, `.app.tar.gz`, `.app.tar.gz.sig` |
| **macOS Intel** | `.dmg`, `.app.tar.gz`, `.app.tar.gz.sig` |
| **Linux** | `.deb`, `.AppImage`, `.AppImage.tar.gz`, `.AppImage.tar.gz.sig` |
| **Windows** | `.msi`, `.nsis.zip`, `.nsis.zip.sig` |
| **Updater** | `latest.json` |

The `.sig` files are signatures for the auto-updater.

## Auto-Updater

The app includes built-in auto-update support via `tauri-plugin-updater`. When a new version is released:

1. The app checks `latest.json` from your GitHub Releases
2. If a newer version exists, it downloads and verifies the update
3. The user can install the update and restart

### Implementing Update UI

Add update checking to your app:

```typescript
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

async function checkForUpdates() {
  const update = await check();
  
  if (update) {
    console.log(`Update available: ${update.version}`);
    
    // Download and install
    await update.downloadAndInstall();
    
    // Restart the app
    await relaunch();
  }
}
```

## Customizing Build Platforms

During `bun run setup`, you selected which platforms to build. To change this later, edit `.github/workflows/publish.yml` and modify the `matrix.include` section.

## Troubleshooting

### Release PR not created

- Ensure you're pushing to the `main` branch
- Check that commits follow conventional commit format
- Look at the Actions tab for workflow errors

### Build failing on specific platform

- Check the Actions logs for detailed error messages
- macOS: Ensure Xcode command line tools are available
- Linux: WebKit dependencies are installed in the workflow
- Windows: Ensure MSVC build tools are available

### Code signing issues

- **macOS**: Verify certificate is valid and not expired
- **Windows**: Check that the signing key password is correct
- Ensure all required secrets are set in repository settings

### Updater not working

- Verify `pubkey` in `tauri.conf.json` matches your public key
- Check that `endpoints` URL is correct and accessible
- Ensure `TAURI_SIGNING_PRIVATE_KEY` secret is set correctly

## Files Reference

| File | Purpose |
|------|---------|
| `.github/workflows/publish.yml` | Release management and builds |
| `.github/release-please-config.json` | release-please configuration |
| `.github/.release-please-manifest.json` | Tracks current version |
| `src-tauri/tauri.conf.json` | Updater configuration |
| `CHANGELOG.md` | Auto-generated changelog |
