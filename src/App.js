import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import { useMemo, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import AuthPage from './pages/AuthPage';
import IngredientsPage from './pages/IngredientsPage';
import LivestockProfilesPage from './pages/LivestockProfilesPage';
import ManualFeedFormulationPage from './pages/ManualFeedFormulationPage';
import SavedFormulationsPage from './pages/SavedFormulationsPage';
import AutomaticFeedFormulationPage from './pages/AutomaticFeedFormulationPage';
import './App.css';

function App() {
    const { user } = useAuth();
    const [mode, setMode] = useState('light');

    const theme = useMemo(() => createTheme({
        palette: {
            mode,
            primary: { main: '#1976d2' },
            secondary: { main: '#9c27b0' }
        },
        typography: {
            h2: { fontWeight: 600 },
            h3: { fontWeight: 600 }
        }
    }), [mode]);

    const toggleMode = () => setMode(prev => (prev === 'light' ? 'dark' : 'light'));

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Navbar mode={mode} onToggleMode={toggleMode} />
                <Container maxWidth="lg" sx={{ pt: 3, pb: 6 }}>
                    <Routes>
                        <Route path="/" element={user ? <ManualFeedFormulationPage /> : <AuthPage />} />
                        <Route path="/ingredients" element={user ? <IngredientsPage /> : <AuthPage />} />
                        <Route path="/livestock-profiles" element={user ? <LivestockProfilesPage /> : <AuthPage />} />
                        <Route path="/automatic-formulation" element={user ? <AutomaticFeedFormulationPage /> : <AuthPage />} />
                        <Route path="/saved-formulations" element={user ? <SavedFormulationsPage /> : <AuthPage />} />
                    </Routes>
                </Container>
            </Router>
        </ThemeProvider>
    );
}

export default App;
