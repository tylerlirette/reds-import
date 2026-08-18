# reds-import

Pulls Red's Auto of Ironwood inventory from the vendor SFTP feed, normalizes it, and publishes `inventory.json` for the WordPress site.

Published URL (after GitHub Pages is enabled):

`https://tylerlirette.github.io/reds-import/inventory.json`

## Local transform (no SFTP)

Uses the checked-in sample fixture:

```bash
npm install
npm run transform
```

Writes `output/inventory.json`.

## Live SFTP sync

Create a `.env` locally if you want to test SFTP on your machine (do not commit it). GitHub Actions reads the same names from repository secrets.

Required secrets:

| Secret | Purpose |
| --- | --- |
| `SFTP_HOST` | Vendor SFTP hostname |
| `SFTP_USER` | Username |
| `SFTP_PASSWORD` | Password |
| `SFTP_REMOTE_PATH` | Full path to the CSV/JSON file on the server |

Optional: `SFTP_PORT` (default `22`).

```bash
npm run sync
```

## GitHub setup

1. Repo **Settings → Secrets and variables → Actions** — add the secrets above.
2. **Settings → Pages** — Source: **Deploy from a branch**, branch **gh-pages**, folder `/ (root)`. After the first workflow run, this branch exists.
3. **Actions → Sync inventory → Run workflow** for the first publish.
4. The workflow also runs every 2 hours.

The JSON URL must be publicly fetchable so WordPress can load it. If this repo is private, either make it public or upgrade GitHub so Pages works on private repos.

Vehicle detail links use:

`https://www.autofind.com/dealer/details/{DealerID}/{VIN}`
