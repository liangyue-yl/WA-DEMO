# WA-DEMO

## GitHub Pages auto deploy

This repository is configured to deploy to GitHub Pages automatically via
GitHub Actions.

- Workflow file: `.github/workflows/deploy-pages.yml`
- Trigger branches:
  - `main`
  - `master`
  - `cursor/whatsapp-interface-modes-e799`
- Also supports manual run with **workflow_dispatch**.

After each push to one of the branches above, GitHub Actions builds and deploys
the site. The preview URL format is:

`https://<github-username>.github.io/<repository-name>/`

For this repository, it should be:

`https://liangyue-yl.github.io/WA-DEMO/`

Because GitHub restricts first-time Pages enablement to repository admins, you
must do a one-time setup before automatic deploy works:

`Settings -> Pages -> Build and deployment -> Source = GitHub Actions`