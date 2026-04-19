import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";

let containerPromise: Promise<AstroContainer> | undefined;

export function getAstroContainer(): Promise<AstroContainer> {
  if (!containerPromise) {
    containerPromise = AstroContainer.create().then((container) => {
      container.addServerRenderer({
        name: "@astrojs/react",
        renderer: reactRenderer,
      });
      container.addClientRenderer({
        name: "@astrojs/react",
        entrypoint: "@astrojs/react/client.js",
      });
      return container;
    });
  }

  return containerPromise;
}
