import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { ComponentsGallery } from "./app/ComponentsGallery";
import "./styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    {import.meta.env.DEV && location.pathname === "/__components" ? <ComponentsGallery /> : <App />}
  </StrictMode>,
);
