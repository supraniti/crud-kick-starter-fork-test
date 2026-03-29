import { useEffect, useMemo } from "react";
import { createTheme } from "@mui/material";

function scaleCssValue(value, scaleRatio) {
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0 || scaleRatio === 1) {
    return value;
  }
  if (typeof value === "number") {
    return value > 4 ? value * scaleRatio : value;
  }
  if (typeof value !== "string") {
    return value;
  }
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em)$/i);
  if (!match) {
    return value;
  }
  const numeric = Number(match[1]);
  const unit = match[2];
  return `${Number((numeric * scaleRatio).toFixed(4))}${unit}`;
}

export function createPageStudioMuiTheme(themeDocument, breakpoint, scaleRatio = 1) {
  const typographyModel = themeDocument?.typographyModel?.[breakpoint] ?? themeDocument?.typographyModel?.desktop ?? {};
  const spacingModel = themeDocument?.spacingModel?.[breakpoint] ?? themeDocument?.spacingModel?.desktop ?? {};
  const colorModel = themeDocument?.colorModel ?? {};
  return createTheme({
    palette: {
      mode: colorModel.background && colorModel.background.toLowerCase() === "#0b1120" ? "dark" : "light",
      primary: { main: colorModel.primary ?? "#8a4b22" },
      secondary: { main: colorModel.secondary ?? "#325c74" },
      background: {
        default: colorModel.background ?? "#f6efe3",
        paper: colorModel.surface ?? "#fffaf2"
      },
      text: {
        primary: colorModel.ink ?? "#1f1720",
        secondary: colorModel.muted ?? "#625a5d"
      }
    },
    shape: {
      borderRadius: Number(spacingModel.radius ?? 24) * scaleRatio
    },
    spacing: (Number(spacingModel.blockGap ?? 16) * scaleRatio) / 4,
    typography: {
      fontFamily: themeDocument?.resolved?.fonts?.bodyFamily ?? "'Source Serif 4', serif",
      h1: {
        fontFamily: themeDocument?.resolved?.fonts?.headingFamily ?? "'Fraunces', serif",
        fontSize: scaleCssValue(typographyModel.h1?.fontSize, scaleRatio),
        lineHeight: typographyModel.h1?.lineHeight,
        fontWeight: typographyModel.h1?.fontWeight,
        letterSpacing: scaleCssValue(typographyModel.h1?.letterSpacing, scaleRatio)
      },
      h2: {
        fontFamily: themeDocument?.resolved?.fonts?.headingFamily ?? "'Fraunces', serif",
        fontSize: scaleCssValue(typographyModel.h2?.fontSize, scaleRatio),
        lineHeight: typographyModel.h2?.lineHeight,
        fontWeight: typographyModel.h2?.fontWeight,
        letterSpacing: scaleCssValue(typographyModel.h2?.letterSpacing, scaleRatio)
      },
      h3: {
        fontFamily: themeDocument?.resolved?.fonts?.headingFamily ?? "'Fraunces', serif",
        fontSize: scaleCssValue(typographyModel.h3?.fontSize, scaleRatio),
        lineHeight: typographyModel.h3?.lineHeight,
        fontWeight: typographyModel.h3?.fontWeight,
        letterSpacing: scaleCssValue(typographyModel.h3?.letterSpacing, scaleRatio)
      },
      body1: {
        fontSize: scaleCssValue(typographyModel.body?.fontSize, scaleRatio),
        lineHeight: typographyModel.body?.lineHeight,
        fontWeight: typographyModel.body?.fontWeight
      },
      caption: {
        fontSize: scaleCssValue(typographyModel.caption?.fontSize, scaleRatio),
        lineHeight: typographyModel.caption?.lineHeight,
        fontWeight: typographyModel.caption?.fontWeight
      }
    }
  });
}

function normalizeStylesheetUrls(themeDocument) {
  return Array.isArray(themeDocument?.resolved?.stylesheetUrls)
    ? themeDocument.resolved.stylesheetUrls
        .filter((value) => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim())
    : [];
}

export function usePageStudioThemeStylesheet(themeDocument) {
  const stylesheetUrls = useMemo(
    () => normalizeStylesheetUrls(themeDocument),
    [themeDocument]
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const legacyStyleNode = document.getElementById("page-studio-preview-fonts");
    if (legacyStyleNode) {
      legacyStyleNode.remove();
    }
    const managedAttribute = "data-page-studio-theme-font";
    const head = document.head;
    if (!head) {
      return;
    }

    const existingNodes = new Map(
      Array.from(document.querySelectorAll(`link[${managedAttribute}]`)).map((node) => [
        node.getAttribute("href"),
        node
      ])
    );

    stylesheetUrls.forEach((href) => {
      if (existingNodes.has(href)) {
        existingNodes.delete(href);
        return;
      }
      const linkNode = document.createElement("link");
      linkNode.setAttribute(managedAttribute, "true");
      linkNode.setAttribute("rel", "stylesheet");
      linkNode.setAttribute("href", href);
      head.appendChild(linkNode);
    });

    existingNodes.forEach((node) => {
      node.remove();
    });
  }, [stylesheetUrls]);
}
