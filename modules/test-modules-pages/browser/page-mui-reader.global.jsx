import React from "react";
import { createRoot } from "react-dom/client";
import { PageMuiReaderApp } from "./page-mui-reader-app.jsx";

const readerRoots = new WeakMap();

function resolveRoot(mountNode) {
  if (!mountNode) {
    throw new Error("MUI reader mount node is required.");
  }
  let root = readerRoots.get(mountNode);
  if (!root) {
    root = createRoot(mountNode);
    readerRoots.set(mountNode, root);
  }
  return root;
}

function renderApplication({
  mountNode,
  application,
  model,
  themeDocument,
  widgetRenderContract,
  activeLocale,
  supportedLocales,
  comments,
  onNavigate,
  onSelectLocale,
  onRefreshComments,
  onSubmitComment
} = {}) {
  const root = resolveRoot(mountNode);
  root.render(
    <React.StrictMode>
      <PageMuiReaderApp
        application={application}
        model={model}
        themeDocument={themeDocument}
        widgetRenderContract={widgetRenderContract}
        activeLocale={activeLocale}
        supportedLocales={supportedLocales}
        comments={comments}
        onNavigate={onNavigate}
        onSelectLocale={onSelectLocale}
        onRefreshComments={onRefreshComments}
        onSubmitComment={onSubmitComment}
      />
    </React.StrictMode>
  );
}

function unmountApplication(mountNode) {
  if (!mountNode) {
    return;
  }
  const root = readerRoots.get(mountNode);
  if (!root) {
    return;
  }
  root.unmount();
  readerRoots.delete(mountNode);
}

window.__CRUD_PAGE_MUI_READER__ = {
  renderApplication,
  unmountApplication
};
