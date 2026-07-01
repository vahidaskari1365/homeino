import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </HelmetProvider>
);
