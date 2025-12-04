import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry-react";
import App from "./App";
import "./index.css";

// Initialize Sentry error tracking
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
