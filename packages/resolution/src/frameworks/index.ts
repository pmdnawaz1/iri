// @ts-nocheck
import type { FrameworkResolver, ResolutionContext } from "../types.js";
import { expressResolver } from "./express.js";
import { nestjsResolver } from "./nestjs.js";
import { nextjsResolver } from "./nextjs.js";
import { djangoResolver, flaskResolver, fastapiResolver } from "./python.js";
import { springResolver } from "./java.js";
import { goResolver } from "./go.js";

const FRAMEWORK_RESOLVERS: FrameworkResolver[] = [
  expressResolver,
  nestjsResolver,
  nextjsResolver,
  djangoResolver,
  flaskResolver,
  fastapiResolver,
  springResolver,
  goResolver,
];

export function getAllFrameworkResolvers(): FrameworkResolver[] {
  return FRAMEWORK_RESOLVERS;
}

export function getFrameworkResolver(name: string): FrameworkResolver | undefined {
  return FRAMEWORK_RESOLVERS.find((r) => r.name === name);
}

export function detectFrameworks(context: ResolutionContext): FrameworkResolver[] {
  return FRAMEWORK_RESOLVERS.filter((resolver) => {
    try {
      return resolver.detect(context);
    } catch {
      return false;
    }
  });
}
