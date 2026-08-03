import { ICachePlugin } from "../../core/plugin";

export function noCache(): ICachePlugin {
  return {
    name: "none",
    version: "1.0.0",
    async get() {
      return null;
    },
    async set() {},
    async delete() {},
  };
}
