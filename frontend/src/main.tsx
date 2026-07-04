import React from "react";
import ReactDOM from "react-dom/client";
import DecoratePage from "./DecoratePage";

const App: React.FC = () => {
  return <DecoratePage />;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);