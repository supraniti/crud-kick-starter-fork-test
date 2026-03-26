import { describe, expect, test, vi } from "vitest";
import { wrapTranslationsHandler } from "../../../modules/test-modules-translations/server/translations-handler-runtime.mjs";

describe("wrapTranslationsHandler.update", () => {
  test("persists updated translationsJson for non-Latin locale overlays", async () => {
    const handler = {
      list: vi.fn().mockResolvedValue({
        items: [
          {
            id: "translat-001",
            entityType: "blog-posts",
            entityId: "blogpost-021",
            fieldPath: "title",
            fieldLabel: "Title",
            entityLabel: "First Cup On The Table",
            sourceLocale: "en-US",
            sourceValue: "First Cup On The Table",
            valueKind: "text",
            translationsJson: "{\"fr-FR\":\"Premiere tasse sur la table\"}",
            createdOn: "2026-03-26T13:13:08.161Z",
            updatedOn: "2026-03-26T15:28:41.735Z"
          }
        ]
      }),
      validateInput: vi.fn().mockResolvedValue({ ok: true, value: {}, errors: [] }),
      update: vi.fn().mockResolvedValue({
        ok: true,
        item: {
          id: "translat-001"
        }
      }),
      findById: vi.fn().mockResolvedValue({
        id: "translat-001",
        entityType: "blog-posts",
        entityId: "blogpost-021",
        fieldPath: "title",
        fieldLabel: "Title",
        entityLabel: "First Cup On The Table",
        sourceLocale: "en-US",
        sourceValue: "First Cup On The Table",
        valueKind: "text",
        translationsJson:
          "{\"fr-FR\":\"Premiere tasse sur la table\",\"he-IL\":\"הכוס הראשונה על השולחן\"}",
        createdOn: "2026-03-26T13:13:08.161Z",
        updatedOn: "2026-03-26T15:52:00.000Z"
      })
    };
    const wrappedHandler = wrapTranslationsHandler(handler);

    const existingItem = {
      id: "translat-001",
      entityType: "blog-posts",
      entityId: "blogpost-021",
      fieldPath: "title",
      fieldLabel: "Title",
      entityLabel: "First Cup On The Table",
      sourceLocale: "en-US",
      sourceValue: "First Cup On The Table",
      valueKind: "text",
      translationsJson: "{\"fr-FR\":\"Premiere tasse sur la table\"}",
      createdOn: "2026-03-26T13:13:08.161Z",
      updatedOn: "2026-03-26T15:28:41.735Z"
    };

    const result = await wrappedHandler.update({
      body: {
        entityType: "blog-posts",
        entityId: "blogpost-021",
        entityLabel: "First Cup On The Table",
        fieldPath: "title",
        fieldLabel: "Title",
        sourceLocale: "en-US",
        sourceValue: "First Cup On The Table",
        valueKind: "text",
        translations: {
          "fr-FR": "Premiere tasse sur la table",
          "he-IL": "הכוס הראשונה על השולחן"
        }
      },
      item: existingItem,
      reply: {}
    });

    expect(handler.update).toHaveBeenCalledTimes(1);
    const [{ body, value }] = handler.update.mock.calls[0];
    expect(body.translationsJson).toContain("\"he-IL\"");
    expect(value.translationsJson).toContain("\"he-IL\"");
    expect(result.item.translations["he-IL"]).toBe("הכוס הראשונה על השולחן");
  });
});
