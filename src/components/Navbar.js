import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useState, useMemo } from 'react';

const Navbar = ({ mode = 'light', onToggleMode }) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = useMemo(() => (
        user ? [
            { label: 'Manual Formulation', to: '/' },
            { label: 'Auto Formulation', to: '/automatic-formulation' },
            { label: 'Ingredients', to: '/ingredients' },
            { label: 'Livestock Profiles', to: '/livestock-profiles' },
            { label: 'Saved Formulations', to: '/saved-formulations' },
        ] : [
            { label: 'Login', to: '/' },
        ]
    ), [user]);

    const handleOpenDrawer = () => setMobileOpen(true);
    const handleCloseDrawer = () => setMobileOpen(false);
    const handleNavigate = (to) => {
        navigate(to);
        handleCloseDrawer();
    };

    return (
        <>
            <AppBar position="sticky" elevation={0}>
                <Toolbar>
                    {/* Mobile: menu button */}
                    <Box sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 1 }}>
                        <IconButton color="inherit" aria-label="buka menu" onClick={handleOpenDrawer}>
                            <MenuIcon />
                        </IconButton>
                    </Box>

                    {/* Brand */}
                    <Typography variant="h6" component={Link} to="/" color="inherit" sx={{ textDecoration: 'none', fontWeight: 700 }}>
                        Feed Formulator
                    </Typography>

                    {/* Desktop: horizontal links */}
                    <Box sx={{ flexGrow: 1, ml: 3, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                        {navItems.map((item) => (
                            <Button key={item.to} color="inherit" component={Link} to={item.to}>
                                {item.label}
                            </Button>
                        ))}
                    </Box>

                    {/* Actions: signout + theme toggle */}
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

            {/* Mobile Drawer */}
            <Drawer anchor="left" open={mobileOpen} onClose={handleCloseDrawer} ModalProps={{ keepMounted: true }}>
                <Box sx={{ width: 280 }} role="presentation" onKeyDown={(e) => e.key === 'Escape' && handleCloseDrawer()}>
                    <Box sx={{ px: 2, py: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Menu
                        </Typography>
                    </Box>
                    <Divider />
                    <List>
                        {navItems.map((item) => (
                            <ListItem key={item.to} disablePadding>
                                <ListItemButton onClick={() => handleNavigate(item.to)}>
                                    <ListItemText primary={item.label} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Divider />
                    <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1 }}>
                        {user && (
                            <Button fullWidth variant="outlined" color="inherit" onClick={() => { signOut(); handleCloseDrawer(); }}>
                                Sign Out
                            </Button>
                        )}
                        <Button fullWidth variant="contained" color="primary" onClick={() => { onToggleMode(); }}>
                            {mode === 'light' ? 'Dark' : 'Light'} Mode
                        </Button>
                    </Box>
                </Box>
            </Drawer>
        </>
    );
};

export default Navbar;