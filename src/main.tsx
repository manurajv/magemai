import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { brand } from "@/config/brand";
import "@/styles/tokens.css";

const description = document.querySelector('meta[name="description"]');
if (description) description.setAttribute("content", brand.tagline);
document.title = brand.name;

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
