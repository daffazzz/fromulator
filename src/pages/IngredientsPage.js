import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import IngredientForm from '../components/IngredientForm'; // Import the form
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

const IngredientsPage = () => {
    const [ingredients, setIngredients] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState(null);

    useEffect(() => {
        fetchIngredients();
    }, []);

    const fetchIngredients = async () => {
        const { data, error } = await supabase.from('ingredients').select('*');
        if (error) console.error('Error fetching ingredients:', error);
        else setIngredients(data);
    };

    const handleAdd = () => {
        setSelectedIngredient(null);
        setShowForm(true);
    };

    const handleEdit = (ingredient) => {
        setSelectedIngredient(ingredient);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this ingredient?')) {
            const { error } = await supabase.from('ingredients').delete().eq('id', id);
            if (error) console.error('Error deleting ingredient:', error);
            else fetchIngredients();
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        fetchIngredients(); // Refresh the list after closing the form
    };

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
                Feed Ingredients
            </Typography>

            <SectionCard
                title="Daftar Bahan"
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
                        Tambah Bahan
                    </Button>
                }
            >
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Nama</TableCell>
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
                            {ingredients.map((ing) => (
                                <TableRow key={ing.id}>
                                    <TableCell>{ing.name}</TableCell>
                                    <TableCell>{ing.pk}</TableCell>
                                    <TableCell>{ing.me}</TableCell>
                                    <TableCell>{ing.sk}</TableCell>
                                    <TableCell>{ing.lk}</TableCell>
                                    <TableCell>{ing.ca}</TableCell>
                                    <TableCell>{ing.p}</TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <IconButton color="primary" onClick={() => handleEdit(ing)}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => handleDelete(ing.id)}>
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

            <Dialog open={showForm} onClose={handleCloseForm} fullWidth maxWidth="sm">
                <DialogTitle>{selectedIngredient ? 'Edit Bahan' : 'Tambah Bahan Baru'}</DialogTitle>
                <DialogContent>
                    {showForm && (
                        <IngredientForm ingredient={selectedIngredient} onClose={handleCloseForm} />
                    )}
                </DialogContent>
            </Dialog>
        </Container>
    );
};

export default IngredientsPage;