import { isModuleRouteViewActionType } from "../../../shared-capability-bridges/route-view-catalog.mjs";
import { VIEW_REGISTRATION_CODES } from "./00-route-state-and-constants.js";
import {
  firstUnknownDescriptorField,
  validateActions,
  validateQuickActions,
  validateRequiredDomains,
  validateRouteStateAdapter
} from "./01-validation-helpers.js";

function descriptorError(index, code, message, extra = {}) {
  return {
    ok: false,
    error: {
      code,
      message,
      index,
      ...extra
    }
  };
}

function validateDescriptorShape(descriptor, index) {
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) {
    return descriptorError(
      index,
      VIEW_REGISTRATION_CODES.INVALID_DESCRIPTOR,
      `View registration at index ${index} must be an object`
    );
  }

  const unknownField = firstUnknownDescriptorField(descriptor);
  if (unknownField) {
    return descriptorError(
      index,
      VIEW_REGISTRATION_CODES.UNKNOWN_FIELD,
      `View registration field '${unknownField}' is not supported`,
      {
        field: unknownField
      }
    );
  }

  return {
    ok: true
  };
}

function resolveValidatedModuleId(descriptor, index) {
  const moduleId = typeof descriptor.moduleId === "string" ? descriptor.moduleId.trim() : "";
  if (moduleId.length === 0) {
    return descriptorError(
      index,
      VIEW_REGISTRATION_CODES.INVALID_DESCRIPTOR,
      "View registration requires a non-empty moduleId",
      {
        field: "moduleId"
      }
    );
  }

  return {
    ok: true,
    moduleId
  };
}

function validateDescriptorRender(descriptor, index, moduleId) {
  if (typeof descriptor.render === "function") {
    return {
      ok: true
    };
  }

  return descriptorError(
    index,
    VIEW_REGISTRATION_CODES.INVALID_DESCRIPTOR,
    `View registration '${moduleId}' requires a render function`,
    {
      moduleId,
      field: "render"
    }
  );
}

function validateUsesCollectionsDomain(descriptor, index, moduleId) {
  if (
    descriptor.usesCollectionsDomain !== undefined &&
    typeof descriptor.usesCollectionsDomain !== "boolean"
  ) {
    return descriptorError(
      index,
      VIEW_REGISTRATION_CODES.INVALID_DESCRIPTOR,
      `View registration '${moduleId}' must use boolean usesCollectionsDomain`,
      {
        moduleId,
        field: "usesCollectionsDomain"
      }
    );
  }

  return {
    ok: true,
    usesCollectionsDomain: descriptor.usesCollectionsDomain === true
  };
}

function validateDescriptorRunAction(descriptor, index, moduleId) {
  if (descriptor.runAction === undefined || typeof descriptor.runAction === "function") {
    return {
      ok: true
    };
  }

  return descriptorError(
    index,
    VIEW_REGISTRATION_CODES.ACTION_RUNNER_INVALID,
    `View registration '${moduleId}' runAction must be a function when provided`,
    {
      moduleId,
      field: "runAction"
    }
  );
}

function validateDescriptorActionRunnerRequirement(
  descriptor,
  actionsValidation,
  index,
  moduleId
) {
  const hasModuleAction = actionsValidation.value.some((action) =>
    isModuleRouteViewActionType(action.type)
  );
  if (!hasModuleAction || typeof descriptor.runAction === "function") {
    return {
      ok: true
    };
  }

  return descriptorError(
    index,
    VIEW_REGISTRATION_CODES.ACTION_RUNNER_INVALID,
    `View registration '${moduleId}' requires runAction when actions include type 'module' or 'module:<token>'`,
    {
      moduleId,
      field: "runAction"
    }
  );
}

function validateDescriptorShell(descriptor, index, moduleId) {
  if (descriptor.shell === undefined || descriptor.shell === null) {
    return {
      ok: true,
      value: null
    };
  }

  if (!descriptor.shell || typeof descriptor.shell !== "object" || Array.isArray(descriptor.shell)) {
    return descriptorError(
      index,
      VIEW_REGISTRATION_CODES.INVALID_DESCRIPTOR,
      `View registration '${moduleId}' shell must be an object when provided`,
      {
        moduleId,
        field: "shell"
      }
    );
  }

  const unknownField = Object.keys(descriptor.shell).find((key) => key !== "mode");
  if (unknownField) {
    return descriptorError(
      index,
      VIEW_REGISTRATION_CODES.UNKNOWN_FIELD,
      `View registration '${moduleId}' shell field '${unknownField}' is not supported`,
      {
        moduleId,
        field: `shell.${unknownField}`
      }
    );
  }

  const mode =
    typeof descriptor.shell.mode === "string" ? descriptor.shell.mode.trim().toLowerCase() : "";
  if (mode.length === 0 || mode === "default") {
    return {
      ok: true,
      value: {
        mode: "default"
      }
    };
  }

  if (mode !== "immersive") {
    return descriptorError(
      index,
      VIEW_REGISTRATION_CODES.INVALID_DESCRIPTOR,
      `View registration '${moduleId}' shell mode must be 'default' or 'immersive'`,
      {
        moduleId,
        field: "shell.mode"
      }
    );
  }

  return {
    ok: true,
    value: {
      mode: "immersive"
    }
  };
}

function validateViewDescriptor(descriptor, index) {
  const shapeValidation = validateDescriptorShape(descriptor, index);
  if (!shapeValidation.ok) {
    return shapeValidation;
  }

  const moduleIdValidation = resolveValidatedModuleId(descriptor, index);
  if (!moduleIdValidation.ok) {
    return moduleIdValidation;
  }
  const moduleId = moduleIdValidation.moduleId;

  const renderValidation = validateDescriptorRender(descriptor, index, moduleId);
  if (!renderValidation.ok) {
    return renderValidation;
  }

  const usesCollectionsDomainValidation = validateUsesCollectionsDomain(
    descriptor,
    index,
    moduleId
  );
  if (!usesCollectionsDomainValidation.ok) {
    return usesCollectionsDomainValidation;
  }
  const usesCollectionsDomain = usesCollectionsDomainValidation.usesCollectionsDomain;

  const requiredDomainsValidation = validateRequiredDomains(descriptor.requiredDomains, {
    index,
    moduleId,
    usesCollectionsDomain
  });
  if (!requiredDomainsValidation.ok) {
    return requiredDomainsValidation;
  }

  const routeStateAdapterValidation = validateRouteStateAdapter(descriptor.routeStateAdapter, {
    index,
    moduleId
  });
  if (!routeStateAdapterValidation.ok) {
    return routeStateAdapterValidation;
  }

  const runActionValidation = validateDescriptorRunAction(descriptor, index, moduleId);
  if (!runActionValidation.ok) {
    return runActionValidation;
  }

  const quickActionsValidation = validateQuickActions(descriptor.quickActions, {
    index,
    moduleId
  });
  if (!quickActionsValidation.ok) {
    return quickActionsValidation;
  }

  const actionsValidation = validateActions(descriptor.actions, {
    index,
    moduleId
  });
  if (!actionsValidation.ok) {
    return actionsValidation;
  }

  const actionRunnerRequirement = validateDescriptorActionRunnerRequirement(
    descriptor,
    actionsValidation,
    index,
    moduleId
  );
  if (!actionRunnerRequirement.ok) {
    return actionRunnerRequirement;
  }

  const shellValidation = validateDescriptorShell(descriptor, index, moduleId);
  if (!shellValidation.ok) {
    return shellValidation;
  }

  return {
    ok: true,
    value: {
      moduleId,
      render: descriptor.render,
      usesCollectionsDomain,
      routeStateAdapter: routeStateAdapterValidation.value,
      requiredDomains: requiredDomainsValidation.value,
      quickActions: quickActionsValidation.value,
      actions: actionsValidation.value,
      ...(shellValidation.value ? { shell: shellValidation.value } : {}),
      ...(typeof descriptor.runAction === "function"
        ? { runAction: descriptor.runAction }
        : {})
    }
  };
}

export { validateViewDescriptor };
