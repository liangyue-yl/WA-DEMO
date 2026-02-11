import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repository = process.env.GITHUB_REPOSITORY || "";
const repositoryName = repository.split("/")[1];
const pagesBase =
  process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : "/";

export default defineConfig({
  plugins: [react()],
  base: pagesBase,
});
