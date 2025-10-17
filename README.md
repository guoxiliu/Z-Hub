# Z-Hub

Z-Hub is an online platform that integrates lossy compression modules, compositions, analysis, and datasets.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Contribution

### Dataset submission

This site uses a GitHub Issues + Actions workflow to accept dataset submissions without a backend server:

- Click "Submit a dataset" on the Datasets page.
- A prefilled GitHub Issue will open  in this repo.
- A GitHub Action ingests issues labeled `dataset` and updates `public/datasets.json` via an automated PR.
- The site reads `public/datasets.json` at runtime to display community datasets.

Setup:

- Ensure this repository is public and Pages is enabled.
- Create `.env` with `VITE_GITHUB_REPO=owner/repo` and optionally set `base` in `vite.config.js` if deploying to a sub-path.
- Keep `public/datasets.json` committed.

Files:

- `.github/ISSUE_TEMPLATE/dataset_submission.yml` – Issue form shown to submitters.
- `.github/workflows/ingest-dataset-issues.yml` – Action to parse issues and open PRs.
- `public/datasets.json` – Data file consumed by the site.
