import { ThemeProvider } from 'next-themes';
import EarthquakeDashboard from './pages/EarthquakeDashboard';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen bg-background">
        <EarthquakeDashboard />
      </div>
    </ThemeProvider>
  );
}

export default App;
