import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import {
    Container,
    Grid,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    IconButton,
    Chip,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import SectionCard from '../components/SectionCard';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from 'recharts';

const ManualFeedFormulationPage = () => {
    const [profiles, setProfiles] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [formulation, setFormulation] = useState([]); // [{ ingredient, percentage }]
    const [targets, setTargets] = useState(null);
    const [totals, setTotals] = useState({});
    const [radarMode, setRadarMode] = useState('absolute'); // 'absolute' | 'percent'

    const COLORS = ['#1976d2', '#9c27b0', '#2e7d32', '#ff9800', '#d32f2f', '#00695c', '#7b1fa2', '#c0ca33'];

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Fetch profiles (user-specific and global)
        const { data: profileData, error: profileError } = await supabase
            .from('livestock_profiles')
            .select('*, livestock_needs(*)')
            .or(`user_id.eq.${user.id},user_id.is.null`);

        if (profileError) console.error('Error fetching profiles:', profileError);
        else setProfiles(profileData);

        // Fetch ingredients (user-specific and global)
        const { data: ingredientData, error: ingredientError } = await supabase
            .from('ingredients')
            .select('*')
            .or(`user_id.eq.${user.id},user_id.is.null`);

        if (ingredientError) console.error('Error fetching ingredients:', ingredientError);
        else setIngredients(ingredientData);
    };

    // totals effect placed after calculateTotals definition

    const handleProfileChange = (profileId) => {
        const profile = profiles.find(p => p.id === parseInt(profileId));
        setSelectedProfile(profile);
        setTargets(profile?.livestock_needs[0] || null);
    };

    const addIngredientRow = () => {
        // Add a new empty row
        setFormulation([...formulation, { ingredientId: '', percentage: 0 }]);
    };

    const removeIngredientRow = (index) => {
        const newFormulation = [...formulation];
        newFormulation.splice(index, 1);
        setFormulation(newFormulation);
    };

    const handleFormulationChange = (index, field, value) => {
        const newFormulation = [...formulation];
        if (field === 'ingredientId') {
            newFormulation[index].ingredientId = value;
        } else if (field === 'percentage') {
            newFormulation[index].percentage = parseFloat(value) || 0;
        }
        setFormulation(newFormulation);
    };

    const calculateTotals = useCallback(() => {
        const newTotals = {
            pk: 0, me: 0, sk: 0, lk: 0, ca: 0, p: 0, totalPercentage: 0
        };

        formulation.forEach(item => {
            const ingredient = ingredients.find(i => i.id === parseInt(item.ingredientId));
            if (ingredient && item.percentage > 0) {
                const percentage = item.percentage / 100;
                newTotals.pk += ingredient.pk * percentage;
                newTotals.me += ingredient.me * percentage;
                newTotals.sk += ingredient.sk * percentage;
                newTotals.lk += ingredient.lk * percentage;
                newTotals.ca += ingredient.ca * percentage;
                newTotals.p += ingredient.p * percentage;
                newTotals.totalPercentage += item.percentage;
            }
        });

        setTotals(newTotals);
    }, [formulation, ingredients]);

    useEffect(() => {
        calculateTotals();
    }, [calculateTotals]);

    const handleSaveFormulation = async () => {
        const formulationName = prompt('Please enter a name for your formulation:');
        if (!formulationName || !selectedProfile) {
            alert('Please provide a formulation name and select a livestock profile.');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        // 1. Save to saved_formulations
        const { data: savedFormulation, error: saveError } = await supabase
            .from('saved_formulations')
            .insert({
                name: formulationName,
                user_id: user.id,
                livestock_profile_id: selectedProfile.id
            })
            .select()
            .single();

        if (saveError) {
            console.error('Error saving formulation:', saveError);
            alert('Error saving formulation.');
            return;
        }

        // 2. Save to formulation_details
        const formulationDetails = formulation.map(row => ({
            formulation_id: savedFormulation.id,
            ingredient_id: row.ingredientId,
            percentage: row.percentage
        }));

        const { error: detailsError } = await supabase
            .from('formulation_details')
            .insert(formulationDetails);

        if (detailsError) {
            console.error('Error saving formulation details:', detailsError);
            alert('Error saving formulation details.');
        } else {
            alert('Formulation saved successfully!');
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
                Manual Feed Formulation
            </Typography>

            <Grid container spacing={3}>
                {/* Profile Selection */}
                <Grid item xs={12} md={6}>
                    <SectionCard title="1. Pilih Profil Ternak">
                        <FormControl fullWidth>
                            <InputLabel id="profile-select-label">Profil Ternak</InputLabel>
                            <Select
                                labelId="profile-select-label"
                                label="Profil Ternak"
                                onChange={(e) => handleProfileChange(e.target.value)}
                                defaultValue=""
                            >
                                <MenuItem value="" disabled>
                                    Pilih profil
                                </MenuItem>
                                {profiles.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {`${p.species} - ${p.type} - ${p.stage}`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </SectionCard>
                </Grid>

                {/* Nutritional Targets Display */}
                <Grid item xs={12} md={6}>
                    <SectionCard title="Kebutuhan Nutrisi">
                        {targets ? (
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip label={`PK: ${targets.pk_target}%`} />
                                <Chip label={`ME: ${targets.me_target} kcal/kg`} />
                                <Chip label={`SK: ${targets.sk_target}%`} />
                                <Chip label={`LK: ${targets.lk_target}%`} />
                                <Chip label={`Ca: ${targets.ca_target}%`} />
                                <Chip label={`P: ${targets.p_target}%`} />
                            </Stack>
                        ) : (
                            <Typography color="text.secondary">Silakan pilih profil untuk melihat target nutrisi.</Typography>
                        )}
                    </SectionCard>
                </Grid>

                {/* Formulation Table */}
                <Grid item xs={12}>
                    <SectionCard
                        title="2. Formulasikan Pakan"
                        actions={
                            <Stack direction="row" spacing={1}>
                                <Button variant="outlined" startIcon={<AddIcon />} onClick={addIngredientRow}>
                                    Tambah Bahan
                                </Button>
                                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveFormulation}>
                                    Simpan Formula
                                </Button>
                            </Stack>
                        }
                    >
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Bahan</TableCell>
                                        <TableCell>Persentase (%)</TableCell>
                                        <TableCell align="right">Aksi</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {formulation.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell sx={{ minWidth: 280 }}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel id={`ingredient-${index}`}>Bahan</InputLabel>
                                                    <Select
                                                        labelId={`ingredient-${index}`}
                                                        label="Bahan"
                                                        value={item.ingredientId}
                                                        onChange={(e) =>
                                                            handleFormulationChange(index, 'ingredientId', e.target.value)
                                                        }
                                                    >
                                                        <MenuItem value="" disabled>
                                                            Pilih bahan
                                                        </MenuItem>
                                                        {ingredients.map((ing) => (
                                                            <MenuItem key={ing.id} value={ing.id}>
                                                                {ing.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                            <TableCell sx={{ width: 200 }}>
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={item.percentage}
                                                    onChange={(e) =>
                                                        handleFormulationChange(index, 'percentage', e.target.value)
                                                    }
                                                    inputProps={{ min: 0, step: 0.1 }}
                                                    fullWidth
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton color="error" onClick={() => removeIngredientRow(index)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </SectionCard>
                </Grid>

                {/* Ingredient Nutrient Content */}
                <Grid item xs={12}>
                    <SectionCard title="Kandungan Bahan Terpilih">
                        {formulation.filter((f) => f.ingredientId).length === 0 ? (
                            <Typography color="text.secondary">Pilih bahan pada tabel formulasi untuk melihat kandungan nutrisi tiap bahan.</Typography>
                        ) : (
                            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Bahan</TableCell>
                                            <TableCell>PK (%)</TableCell>
                                            <TableCell>ME (kcal/kg)</TableCell>
                                            <TableCell>SK (%)</TableCell>
                                            <TableCell>LK (%)</TableCell>
                                            <TableCell>Ca (%)</TableCell>
                                            <TableCell>P (%)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formulation
                                            .filter((f) => f.ingredientId)
                                            .map((f, idx) => {
                                                const ing = ingredients.find((i) => i.id === parseInt(f.ingredientId));
                                                if (!ing) return null;
                                                return (
                                                    <TableRow key={idx}>
                                                        <TableCell>{ing.name}</TableCell>
                                                        <TableCell>{Number(ing.pk || 0).toFixed(2)}</TableCell>
                                                        <TableCell>{Number(ing.me || 0).toFixed(0)}</TableCell>
                                                        <TableCell>{Number(ing.sk || 0).toFixed(2)}</TableCell>
                                                        <TableCell>{Number(ing.lk || 0).toFixed(2)}</TableCell>
                                                        <TableCell>{Number(ing.ca || 0).toFixed(2)}</TableCell>
                                                        <TableCell>{Number(ing.p || 0).toFixed(2)}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </SectionCard>
                </Grid>

                {/* Totals and Comparison */}
                <Grid item xs={12}>
                    <SectionCard title="3. Analisis dan Perbandingan">
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Nutrien</TableCell>
                                        <TableCell>Target</TableCell>
                                        <TableCell>Formulasi</TableCell>
                                        <TableCell>Selisih</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Total Persentase</TableCell>
                                        <TableCell>100%</TableCell>
                                        <TableCell>{(totals.totalPercentage || 0).toFixed(2)}%</TableCell>
                                        <TableCell sx={{ color: Math.abs(100 - (totals.totalPercentage || 0)) > 0.1 ? 'error.main' : 'success.main' }}>
                                            {((totals.totalPercentage || 0) - 100).toFixed(2)}%
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Protein Kasar (PK)</TableCell>
                                        <TableCell>{targets?.pk_target || 0}%</TableCell>
                                        <TableCell>{(totals.pk || 0).toFixed(2)}%</TableCell>
                                        <TableCell sx={{ color: (totals.pk || 0) < (targets?.pk_target || 0) ? 'error.main' : 'success.main' }}>
                                            {((totals.pk || 0) - (targets?.pk_target || 0)).toFixed(2)}%
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Energi Metabolik (ME)</TableCell>
                                        <TableCell>{targets?.me_target || 0} kcal/kg</TableCell>
                                        <TableCell>{(totals.me || 0).toFixed(2)} kcal/kg</TableCell>
                                        <TableCell sx={{ color: (totals.me || 0) < (targets?.me_target || 0) ? 'error.main' : 'success.main' }}>
                                            {((totals.me || 0) - (targets?.me_target || 0)).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Serat Kasar (SK)</TableCell>
                                        <TableCell>{targets?.sk_target || 0}%</TableCell>
                                        <TableCell>{(totals.sk || 0).toFixed(2)}%</TableCell>
                                        <TableCell sx={{ color: (totals.sk || 0) < (targets?.sk_target || 0) ? 'error.main' : 'success.main' }}>
                                            {((totals.sk || 0) - (targets?.sk_target || 0)).toFixed(2)}%
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Lemak Kasar (LK)</TableCell>
                                        <TableCell>{targets?.lk_target || 0}%</TableCell>
                                        <TableCell>{(totals.lk || 0).toFixed(2)}%</TableCell>
                                        <TableCell sx={{ color: (totals.lk || 0) < (targets?.lk_target || 0) ? 'error.main' : 'success.main' }}>
                                            {((totals.lk || 0) - (targets?.lk_target || 0)).toFixed(2)}%
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Kalsium (Ca)</TableCell>
                                        <TableCell>{targets?.ca_target || 0}%</TableCell>
                                        <TableCell>{(totals.ca || 0).toFixed(2)}%</TableCell>
                                        <TableCell sx={{ color: (totals.ca || 0) < (targets?.ca_target || 0) ? 'error.main' : 'success.main' }}>
                                            {((totals.ca || 0) - (targets?.ca_target || 0)).toFixed(2)}%
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Fosfor (P)</TableCell>
                                        <TableCell>{targets?.p_target || 0}%</TableCell>
                                        <TableCell>{(totals.p || 0).toFixed(2)}%</TableCell>
                                        <TableCell sx={{ color: (totals.p || 0) < (targets?.p_target || 0) ? 'error.main' : 'success.main' }}>
                                            {((totals.p || 0) - (targets?.p_target || 0)).toFixed(2)}%
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </SectionCard>
                </Grid>

                {/* Charts Section */}
                <Grid item xs={12} md={6}>
                    <SectionCard title="Komposisi Bahan (Pie)">
                        <div style={{ width: '100%', height: 320 }}>
                            <ResponsiveContainer>
                                {(() => {
                                    const pieData = formulation
                                        .filter((f) => f.ingredientId && Number(f.percentage) > 0)
                                        .map((f) => {
                                            const ing = ingredients.find((i) => i.id === parseInt(f.ingredientId));
                                            return { name: ing?.name || `Bahan ${f.ingredientId}`, value: Number(f.percentage) || 0 };
                                        });
                                    return (
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label
                                            >
                                                {pieData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    );
                                })()}
                            </ResponsiveContainer>
                        </div>
                    </SectionCard>
                </Grid>

                <Grid item xs={12} md={6}>
                    <SectionCard title="Perbandingan Nutrisi (Radar)">
                        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                            <ToggleButtonGroup
                                size="small"
                                value={radarMode}
                                exclusive
                                onChange={(_, v) => v && setRadarMode(v)}
                            >
                                <ToggleButton value="absolute">Angka</ToggleButton>
                                <ToggleButton value="percent">Persentase</ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>
                        <div style={{ width: '100%', height: 320 }}>
                            <ResponsiveContainer>
                                {(() => {
                                    const raw = [
                                        { nutrient: 'PK', Target: Number(targets?.pk_target) || 0, Actual: Number(totals?.pk) || 0 },
                                        { nutrient: 'ME', Target: Number(targets?.me_target) || 0, Actual: Number(totals?.me) || 0 },
                                        { nutrient: 'SK', Target: Number(targets?.sk_target) || 0, Actual: Number(totals?.sk) || 0 },
                                        { nutrient: 'LK', Target: Number(targets?.lk_target) || 0, Actual: Number(totals?.lk) || 0 },
                                        { nutrient: 'Ca', Target: Number(targets?.ca_target) || 0, Actual: Number(totals?.ca) || 0 },
                                        { nutrient: 'P', Target: Number(targets?.p_target) || 0, Actual: Number(totals?.p) || 0 },
                                    ];
                                    const dataPercent = raw.map(d => ({
                                        nutrient: d.nutrient,
                                        Target: d.Target > 0 ? 100 : 0,
                                        Actual: d.Target > 0 ? Math.min((d.Actual / d.Target) * 100, 200) : 0,
                                    }));
                                    const isPercent = radarMode === 'percent';
                                    const chartData = isPercent ? dataPercent : raw;
                                    const maxVal = Math.max(...chartData.flatMap(d => [d.Target, d.Actual]));
                                    return (
                                        <RadarChart data={chartData}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="nutrient" />
                                            {isPercent ? (
                                                <PolarRadiusAxis domain={[0, 120]} tickFormatter={(v) => `${v}%`} />
                                            ) : (
                                                <PolarRadiusAxis domain={[0, maxVal || 1]} />
                                            )}
                                            <Radar name={isPercent ? 'Target (100%)' : 'Target'} dataKey="Target" stroke="#1976d2" strokeWidth={2} fill="#1976d2" fillOpacity={0.45} />
                                            <Radar name={isPercent ? 'Formulasi (%)' : 'Formulasi'} dataKey="Actual" stroke="#d32f2f" strokeWidth={2} fill="#d32f2f" fillOpacity={0.45} />
                                            <Legend />
                                            <Tooltip />
                                        </RadarChart>
                                    );
                                })()}
                            </ResponsiveContainer>
                        </div>
                    </SectionCard>
                </Grid>
            </Grid>
        </Container>
    );
};

export default ManualFeedFormulationPage;