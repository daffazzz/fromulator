import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import LivestockProfileForm from '../components/LivestockProfileForm';
import {
    Container,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import SectionCard from '../components/SectionCard';

const LivestockProfilesPage = () => {
    const [profiles, setProfiles] = useState([]);
    const [editingProfile, setEditingProfile] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('livestock_profiles')
            .select(`
                *,
                livestock_needs (*)
            `)
            .or(`user_id.eq.${user.id},user_id.is.null`);

        if (error) console.error('Error fetching profiles:', error);
        else setProfiles(data);
    };

    const handleDelete = async (id) => {
        // First, delete the associated needs
        await supabase.from('livestock_needs').delete().eq('profile_id', id);
        // Then, delete the profile
        const { error } = await supabase.from('livestock_profiles').delete().eq('id', id);
        if (error) console.error('Error deleting profile:', error);
        else fetchProfiles();
    };

    const openForm = (profile = null) => {
        setEditingProfile(profile);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setEditingProfile(null);
        setIsFormOpen(false);
        fetchProfiles();
    };

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
                Livestock Profiles
            </Typography>

            <SectionCard
                title="Daftar Profil Ternak"
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm()}>
                        Tambah Profil
                    </Button>
                }
            >
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Spesies</TableCell>
                                <TableCell>Jenis</TableCell>
                                <TableCell>Fase</TableCell>
                                <TableCell>PK (%)</TableCell>
                                <TableCell>ME (kcal/kg)</TableCell>
                                <TableCell>SK (%)</TableCell>
                                <TableCell>LK (%)</TableCell>
                                <TableCell>Ca (%)</TableCell>
                                <TableCell>P (%)</TableCell>
                                <TableCell align="right">Aksi</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {profiles.map((profile) => (
                                <TableRow key={profile.id}>
                                    <TableCell>{profile.species}</TableCell>
                                    <TableCell>{profile.type}</TableCell>
                                    <TableCell>{profile.stage}</TableCell>
                                    <TableCell>{profile.livestock_needs[0]?.pk_target}</TableCell>
                                    <TableCell>{profile.livestock_needs[0]?.me_target}</TableCell>
                                    <TableCell>{profile.livestock_needs[0]?.sk_target}</TableCell>
                                    <TableCell>{profile.livestock_needs[0]?.lk_target}</TableCell>
                                    <TableCell>{profile.livestock_needs[0]?.ca_target}</TableCell>
                                    <TableCell>{profile.livestock_needs[0]?.p_target}</TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <IconButton color="primary" onClick={() => openForm(profile)}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => handleDelete(profile.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </SectionCard>

            <Dialog open={isFormOpen} onClose={closeForm} fullWidth maxWidth="sm">
                <DialogTitle>{editingProfile ? 'Edit Profil' : 'Tambah Profil Baru'}</DialogTitle>
                <DialogContent>
                    {isFormOpen && (
                        <LivestockProfileForm profile={editingProfile} onClose={closeForm} />
                    )}
                </DialogContent>
            </Dialog>
        </Container>
    );
};

export default LivestockProfilesPage;