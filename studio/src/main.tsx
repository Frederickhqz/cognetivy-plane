import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./index.css";
import "./App.css";
import App from "./App.tsx";

// Get basename from environment or detect from pathname
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/cognetivy';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
