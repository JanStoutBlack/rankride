import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/hooks/useTheme";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
