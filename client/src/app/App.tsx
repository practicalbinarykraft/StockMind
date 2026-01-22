import { Providers } from "./providers";
import { Router } from "./router";

/**
 * Main Application Component
 * 
 * Composition of providers and router
 */
export default function App() {
  return (
    <Providers>
      <Router />
    </Providers>
  );
}
