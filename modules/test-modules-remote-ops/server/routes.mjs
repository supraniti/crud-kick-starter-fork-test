import { registerConnectionRoutes } from "./remote-ops-connection-routes.mjs";
import { registerProvisioningRoutes } from "./remote-ops-provisioning-routes.mjs";
import { createRouteContext } from "./remote-ops-route-runtime.mjs";
import { registerTargetRoutes } from "./remote-ops-target-routes.mjs";

export function registerRoutes(context = {}) {
  const routeContext = createRouteContext(context);
  registerProvisioningRoutes(context.fastify, routeContext);
  registerConnectionRoutes(context.fastify, routeContext);
  registerTargetRoutes(context.fastify, routeContext);
}
