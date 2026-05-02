import { AppServicesProvider } from "./providers/AppServicesProvider.jsx";
import { AppRoutes } from "./routes.jsx";

export default function App() {
  return (
    <AppServicesProvider>
      <AppRoutes />
    </AppServicesProvider>
  );
}
