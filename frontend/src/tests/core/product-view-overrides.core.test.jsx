import { expect, test } from "vitest";
import { resolveViewRegistration } from "../../runtime/view-registry.jsx";

test("product descriptors override editorial and engagement module entrypoints with product-shell views", () => {
  const moduleRuntimeItems = [
    {
      id: "test-modules-editorial",
      ui: {
        routeView: {
          kind: "custom",
          entrypoint: "./frontend/view-entrypoint.jsx"
        }
      },
      collectionIds: ["blog-authors"]
    },
    {
      id: "test-modules-engagement",
      ui: {
        routeView: {
          kind: "custom",
          entrypoint: "./frontend/view-entrypoint.jsx"
        }
      },
      collectionIds: ["blog-comments"]
    }
  ];
  const moduleViewEntrypoints = {
    "../../../../modules/test-modules-editorial/frontend/view-entrypoint.jsx": {
      viewDescriptor: {
        moduleId: "test-modules-editorial",
        usesCollectionsDomain: true,
        render: () => "module-editorial"
      }
    },
    "../../../../modules/test-modules-engagement/frontend/view-entrypoint.jsx": {
      viewDescriptor: {
        moduleId: "test-modules-engagement",
        usesCollectionsDomain: true,
        render: () => "module-engagement"
      }
    }
  };

  const editorialRegistration = resolveViewRegistration("test-modules-editorial", {
    moduleRuntimeItems,
    moduleViewEntrypoints
  });
  const engagementRegistration = resolveViewRegistration("test-modules-engagement", {
    moduleRuntimeItems,
    moduleViewEntrypoints
  });

  expect(editorialRegistration).toEqual(
    expect.objectContaining({
      moduleId: "test-modules-editorial",
      usesCollectionsDomain: true,
      requiredDomains: ["collections"],
      render: expect.any(Function)
    })
  );
  expect(engagementRegistration).toEqual(
    expect.objectContaining({
      moduleId: "test-modules-engagement",
      usesCollectionsDomain: true,
      requiredDomains: ["collections"],
      render: expect.any(Function)
    })
  );
  expect(editorialRegistration.render({ navigate: () => {}, collectionsDomain: {} })).not.toBe("module-editorial");
  expect(engagementRegistration.render({ navigate: () => {}, collectionsDomain: {} })).not.toBe("module-engagement");
});
