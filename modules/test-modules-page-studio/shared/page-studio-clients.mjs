export const PAGE_STUDIO_CLIENTS = Object.freeze([
  {
    key: "data-layer",
    label: "Data Layer Client",
    summary: "Lowest-level reader contract using the existing data and action layers."
  },
  {
    key: "reader-test",
    label: "Reader Test Client",
    summary: "Current reader/test client used for proof and contract validation."
  },
  {
    key: "mui-reader",
    label: "MUI Reader Client",
    summary: "Target client for preview and live parity using MUI components at deployment time."
  }
]);

export function resolvePageStudioClient(clientKey) {
  return PAGE_STUDIO_CLIENTS.find((entry) => entry.key === clientKey) ?? PAGE_STUDIO_CLIENTS[0];
}
