import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./contexts/LanguageContext";
import EarthquakeDashboard from "./pages/EarthquakeDashboard";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider>
        <div className="min-h-screen bg-background">
          <EarthquakeDashboard />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
