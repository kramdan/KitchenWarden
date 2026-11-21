# KitchenWarden rename checklist

Working note for the rename from "Kitchen War Room" (KitchenWarRoom) to
"Kitchen Warden" (KitchenWarden). Remove this file once every open item is
closed.

## Decisions made

- Display name: "Kitchen Warden", with "Kitchen Warden Dev" and "Kitchen Warden
  Preview" for the non-production variants.
- Bundle ID namespace: `com.kitchenwarden.app`, with `.dev` and `.preview`
  suffixes. This depends on owning `kitchenwarden.com`.
- URL schemes: `kitchenwarden`, `kitchenwarden-dev`, `kitchenwarden-preview`.
- SQLite files: `kitchenwarden.db`, `kitchenwarden-dev.db`,
  `kitchenwarden-preview.db`.
- Expo slug: `kitchen-warden`.
- Internal `kwr` prefix kept. This covers the secure-storage keys
  (`kwr.<env>.session`, `kwr.<env>.pin.*`, `kwr.<env>.pinAttempts.*`), the CLI
  env vars (`KWR_*`), `kwr.config.json`, and `data/kwr.sqlite`. Changing the
  secure-storage keys would lock existing users out of their PINs and sessions.
- Local data on the new bundle IDs is discarded. A new app ID starts with an
  empty sandbox, and existing SQLite, SecureStore, and photo data does not carry
  over.

## Completed

- Code, config, and documentation renamed (`mobile/config/environments.js`,
  `mobile/app.json`, UI titles, `README.md`, `AGENTS.md`, and the `dev/` docs and
  script).
- Package names renamed in `package.json` and `mobile/package.json`.
- Repository URLs in `package.json` point at `kramdan/KitchenWarden`.
- Local git remote `origin` updated to `https://github.com/kramdan/KitchenWarden.git`.
- GitHub repository renamed to `KitchenWarden`.
- `npm run check` passes after the rename.
- The development variant's resolved Expo config matches the new names and IDs.

## Open items

### Repo and dependencies

- [ ] Run `npm install` at the repo root to regenerate `package-lock.json`.
  The lockfile still has the old package names `kitchenwarroom` and
  `kitchenwarroom-mobile`.
- [ ] Verify the preview and production variants:
  - `EXPO_PUBLIC_APP_ENV=preview npm run mobile:config:check`
  - `EXPO_PUBLIC_APP_ENV=production npm run mobile:config:check`

### Domain

- [ ] Register `kitchenwarden.com`. The bundle ID namespace depends on it.

### EAS project

- [ ] Confirm the Expo account and the owner (user or organization) that should
  own the app.
- [ ] Check the Expo dashboard for an existing `kitchen-war-room` project. Decide
  whether to reuse it or create a new one.
- [ ] If the project belongs to an organization, add an `owner` field to
  `mobile/app.json`.
- [ ] Initialize the project so `extra.eas.projectId` is written to
  `mobile/app.json`:
  - `npx --no-install eas-cli whoami`
  - `npx --no-install eas-cli init`
  - `npx --no-install eas-cli project:info`
- [ ] Accept new credentials for the new bundle IDs. Android keystores and iOS
  provisioning profiles must be generated for `com.kitchenwarden.app*`. Reuse the
  old credentials only if an app under the old IDs has already shipped.

### Trademark and clearance

- [ ] Search the USPTO trademark database for "KITCHEN WARDEN" and close variants
  in classes 9 and 42, plus 35, 43, or 21 if those areas are planned.
- [ ] Search EUIPO and the WIPO Global Brand Database if the app will be
  distributed in the EU or internationally. Search the UK IPO if it will be sold in
  the UK.
- [ ] Run common-use checks: app stores, state business registries, and social
  handles.
- [ ] Have a trademark attorney clear the name before any public launch or store
  listing. A free search is a screen, not clearance.

### Devices and external references

- [ ] Uninstall old dev and preview builds (`com.kitchenwarroom.app*`) from test
  devices. Their data does not carry over to the new IDs.
- [ ] Update any external links, bookmarks, or documents that still point at
  `KitchenWarRoom`.
- [ ] Optional: rename the local `KitchenWarRoom/` folder. This has no effect on
  builds.

## Notes

- `mobile/app.json` will need two more changes once EAS is set up: an `owner`
  field if the project belongs to an organization, and `extra.eas.projectId`
  written by `eas init`.
- Do not run EAS build or submit commands without explicit approval. Use only the
  `whoami`, `init`, and `project:info` commands listed above for setup.
