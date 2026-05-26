import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ToastProvider } from "./features/toast/ToastProvider";

// Offline fonts via @fontsource (bundled for Tauri — no CDN needed)
import "@fontsource-variable/geist";
import "@fontsource-variable/jetbrains-mono";

// Design tokens + application styles
import "./styles/tokens.css";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
