import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "toolbox-1475369",
    compatibilityDate: "2026-11-10",
    observability: {
      enabled: true,
    },
    domains: ["tool.1475369.xyz"],
    assets: {
      notFoundHandling: "404-page",
    },
  },
});
