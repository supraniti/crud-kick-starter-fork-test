import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import "./runtime/field-type-plugin-bootstrap.js";
import App from "./app/App.jsx";
import { appShellTheme } from "./app/parts/00-app-theme.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={appShellTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
