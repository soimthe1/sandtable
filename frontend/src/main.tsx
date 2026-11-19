import React from "react";
import ReactDOM from "react-dom/client";

// Self-hosted webfonts - must come before global.css so the @font-face rules
// are registered first. See fonts.css for why these are bundled rather than
// fetched from Google Fonts (air-gapped deployment).
import "./styles/fonts.css";
import "./styles/global.css";
// After the styles: App imports ./brand, whose optional brand.local/brand.css
// must load after tokens.css to override it.
import "./i18n";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
