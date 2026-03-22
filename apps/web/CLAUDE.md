@AGENTS.md

Use the repository devcontainer workflow as the default for this project. Work from `/workspace/apps/web` inside the container rather than setting up Node on the host machine, and treat `pnpm dev:web` / `pnpm dev:api` as restart or debug commands because the devcontainer already starts the stack.
