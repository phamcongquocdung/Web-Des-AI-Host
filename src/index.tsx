import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthDrawerProvider } from "./context/AuthDrawerContext";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root")!;
createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthDrawerProvider>
        <App />
      </AuthDrawerProvider>
    </BrowserRouter>
  </React.StrictMode>
);
