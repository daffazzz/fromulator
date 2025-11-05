import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const Navbar = ({ mode = 'light', onToggleMode }) => {
    const { user, signOut } = useAuth();

    return (
        <AppBar position="sticky" elevation={0}>
            <Toolbar>
                <Typography variant="h6" component={Link} to="/" color="inherit" sx={{ textDecoration: 'none', fontWeight: 700 }}>
                    Feed Formulator
                </Typography>

                <Box sx={{ flexGrow: 1, ml: 3, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                    {user ? (
                        <>
                            <Button color="inherit" component={Link} to="/">Manual Formulation</Button>
                            <Button color="inherit" component={Link} to="/automatic-formulation">Auto Formulation</Button>
                            <Button color="inherit" component={Link} to="/ingredients">Ingredients</Button>
                            <Button color="inherit" component={Link} to="/livestock-profiles">Livestock Profiles</Button>
                            <Button color="inherit" component={Link} to="/saved-formulations">Saved Formulations</Button>
                        </>
                    ) : (
                        <Button color="inherit" component={Link} to="/">Login</Button>
                    )}
                </Box>

                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user && (
                        <Button variant="outlined" color="inherit" onClick={signOut}>Sign Out</Button>
                    )}
                    <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
                        <IconButton color="inherit" onClick={onToggleMode} aria-label="toggle color mode">
                            {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
                        </IconButton>
                    </Tooltip>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;