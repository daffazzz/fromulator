import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import GLPK from 'glpk.js';
import {
    Typography,
    Grid,
    Container,
    Card,
    CardContent,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Button,
    Divider,
    Tabs,
    Tab,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Tooltip,
    Legend,
} from 'recharts';

const AutomaticFeedFormulationPage = () => {
    const [profiles, setProfiles] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState('');
    const [selectedIngredients, setSelectedIngredients] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [radarMode, setRadarMode] = useState('percent'); // 'percent' | 'absolute'
    const [resultTab, setResultTab] = useState('tabel'); // 'tabel' | 'grafik'

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            const { data: profilesData, error: profilesError } = await supabase
                .from('livestock_profiles')
                .select('*, livestock_needs(*)')
                .or(`user_id.eq.${user.id},user_id.is.null`);

            if (profilesError) console.error('Error fetching profiles', profilesError);
            else setProfiles(profilesData);

            const { data: ingredientsData, error: ingredientsError } = await supabase
                .from('ingredients')
                .select('*')
                .or(`user_id.eq.${user.id},user_id.is.null`);

            if (ingredientsError) console.error('Error fetching ingredients', ingredientsError);
            else setIngredients(ingredientsData);
        };
        fetchData();
    }, []);

    const handleIngredientToggle = (ingredientId) => {
        setSelectedIngredients(prev =>
            prev.includes(ingredientId)
                ? prev.filter(id => id !== ingredientId)
                : [...prev, ingredientId]
        );
    };

    const handleFormulate = async () => {
        try {
            setLoading(true);
            const profile = profiles.find(p => p.id === parseInt(selectedProfile));
            if (!profile || selectedIngredients.length === 0) {
                alert('Silakan pilih profil dan minimal satu bahan.');
                return;
            }

            const targets = profile?.livestock_needs?.[0];
            if (!targets) {
                alert('Profil terpilih belum memiliki data kebutuhan nutrisi.');
                return;
            }

            const formulationIngredients = ingredients.filter(i => selectedIngredients.includes(i.id));
            // Buat nama variabel aman untuk solver (hindari spasi/karakter khusus)
            const varNameMap = {};
            formulationIngredients.forEach(ing => { varNameMap[ing.id] = `x_${ing.id}`; });
            // Helper angka aman
            const safeNum = (v, fb = 0) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : fb;
            };
            // Initialize GLPK instance (returns a Promise in browser)
            const glpk = await GLPK();

            // Build an LP that minimizes deviation from nutrient targets
            // Scale all targets by 100 to match percentage variables (x_i in %)
            const nutrients = [
                { key: 'pk', target: safeNum(targets.pk_target) * 100 },
                { key: 'me', target: safeNum(targets.me_target) * 100 },
                { key: 'sk', target: safeNum(targets.sk_target) * 100 },
                { key: 'lk', target: safeNum(targets.lk_target) * 100 },
                { key: 'ca', target: safeNum(targets.ca_target) * 100 },
                { key: 'p',  target: safeNum(targets.p_target)  * 100 },
            ];

            // Objective: minimize sum of deviations (L1 norm)
            const objectiveVars = [];
            nutrients.forEach(n => {
                objectiveVars.push({ name: `${n.key}_plus`, coef: 1 });
                objectiveVars.push({ name: `${n.key}_minus`, coef: 1 });
            });

            const subjectTo = [];
            // Nutrient equality with deviation variables: sum(x_i * coef) - d_plus + d_minus = target
            nutrients.forEach(n => {
                const vars = [
                    ...formulationIngredients.map(ing => ({ name: varNameMap[ing.id], coef: safeNum(ing[n.key]) })),
                    { name: `${n.key}_plus`, coef: -1 },
                    { name: `${n.key}_minus`, coef:  1 },
                ];
                subjectTo.push({
                    name: `nutrient_${n.key}`,
                    vars,
                    bnds: { type: glpk.GLP_FX, ub: n.target, lb: n.target }
                });
            });

            // Total percentage must equal 100
            subjectTo.push({
                name: 'total',
                vars: formulationIngredients.map(ing => ({ name: varNameMap[ing.id], coef: 1 })),
                bnds: { type: glpk.GLP_FX, ub: 100, lb: 100 }
            });

            const bounds = [
                // Ingredient percentages are non-negative (GLP_LO: lower bound only)
                ...formulationIngredients.map(ing => ({ name: varNameMap[ing.id], type: glpk.GLP_LO, lb: 0 })),
                // Deviation variables are non-negative
                ...nutrients.flatMap(n => [
                    { name: `${n.key}_plus`,  type: glpk.GLP_LO, lb: 0 },
                    { name: `${n.key}_minus`, type: glpk.GLP_LO, lb: 0 },
                ]),
            ];

            const lp = {
                name: 'FeedFormulationClosest',
                objective: { direction: glpk.GLP_MIN, name: 'deviation', vars: objectiveVars },
                subjectTo,
                bounds,
            };

            const solution = await glpk.solve(lp);

            if (solution.result.status === glpk.GLP_OPT || solution.result.status === glpk.GLP_FEAS) {
                // Ambil persentase dari solver
                const ingredientVarsRaw = {};
                formulationIngredients.forEach(ing => {
                    const vName = varNameMap[ing.id];
                    ingredientVarsRaw[ing.name] = safeNum(solution.result.vars[vName]);
                });
                // Normalisasi agar total 100%
                const sumPct = Object.values(ingredientVarsRaw).reduce((acc, v) => acc + safeNum(v), 0);
                const factor = sumPct > 0 ? (100 / sumPct) : 1;
                const ingredientVars = Object.fromEntries(
                    Object.entries(ingredientVarsRaw).map(([name, val]) => [name, safeNum(val) * factor])
                );

                // Hitung hasil nutrisi menggunakan persentase yang sudah dinormalisasi
                const achieved = { pk: 0, me: 0, sk: 0, lk: 0, ca: 0, p: 0 };
                formulationIngredients.forEach(ing => {
                    const pct = safeNum(ingredientVars[ing.name]);
                    achieved.pk += pct * safeNum(ing.pk);
                    achieved.me += pct * safeNum(ing.me);
                    achieved.sk += pct * safeNum(ing.sk);
                    achieved.lk += pct * safeNum(ing.lk);
                    achieved.ca += pct * safeNum(ing.ca);
                    achieved.p  += pct * safeNum(ing.p);
                });
                Object.keys(achieved).forEach(k => achieved[k] = achieved[k] / 100);

                setResult({
                    feasible: true,
                    result: solution.result.z,
                    ingredients: ingredientVars,
                    achieved,
                    targetsDisplay: {
                        pk: Number(targets.pk_target) || 0,
                        me: Number(targets.me_target) || 0,
                        sk: Number(targets.sk_target) || 0,
                        lk: Number(targets.lk_target) || 0,
                        ca: Number(targets.ca_target) || 0,
                        p:  Number(targets.p_target)  || 0,
                    }
                });
            } else {
                alert('Tidak ditemukan solusi yang feasible. Coba pilih bahan berbeda atau sesuaikan target.');
                setResult(null);
            }
        } catch (err) {
            console.error('Formulation runtime error:', err);
            alert('Terjadi kesalahan saat memproses formulasi. Silakan coba lagi.');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="lg">
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h4">Formulator Pakan Otomatis</Typography>
                    <Typography variant="body1" color="text.secondary">
                        Pilih profil ternak dan bahan, lalu sistem akan mencari formulasi terdekat dengan kebutuhan nutrisi.
                    </Typography>
                </Grid>

                {/* Dua kolom: kiri (pilihan), kanan (hasil) */}
                <Grid item xs={12} sm={6} sx={{ minWidth: 0 }}>
                    <Stack spacing={3}>
                        {/* Panel pemilihan profil */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Profil Ternak</Typography>
                                <FormControl fullWidth>
                                    <InputLabel id="profile-label">Profil Ternak</InputLabel>
                                    <Select
                                        labelId="profile-label"
                                        label="Profil Ternak"
                                        value={selectedProfile}
                                        onChange={(e) => setSelectedProfile(e.target.value)}
                                    >
                                        <MenuItem value=""><em>Pilih profil</em></MenuItem>
                                        {profiles.map(p => (
                                            <MenuItem key={p.id} value={p.id}>{`${p.species} - ${p.type} - ${p.stage}`}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </CardContent>
                        </Card>

                        {/* Panel pemilihan bahan */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Pilih Bahan</Typography>
                                <FormGroup>
                                    {ingredients.map(ing => (
                                        <FormControlLabel
                                            key={ing.id}
                                            control={<Checkbox checked={selectedIngredients.includes(ing.id)} onChange={() => handleIngredientToggle(ing.id)} />}
                                            label={ing.name}
                                        />
                                    ))}
                                </FormGroup>

                                {selectedIngredients.length > 0 && (
                                    <>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="subtitle1">Kandungan Bahan Terpilih</Typography>
                                        <TableContainer component={Paper} variant="outlined" sx={{ mt: 1, overflowX: 'auto' }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Bahan</TableCell>
                                                        <TableCell align="right">PK (%)</TableCell>
                                                        <TableCell align="right">ME</TableCell>
                                                        <TableCell align="right">SK (%)</TableCell>
                                                        <TableCell align="right">LK (%)</TableCell>
                                                        <TableCell align="right">Ca (%)</TableCell>
                                                        <TableCell align="right">P (%)</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {ingredients
                                                        .filter(i => selectedIngredients.includes(i.id))
                                                        .map(ing => (
                                                            <TableRow key={ing.id}>
                                                                <TableCell>{ing.name}</TableCell>
                                                                <TableCell align="right">{Number(ing.pk || 0).toFixed(2)}</TableCell>
                                                                <TableCell align="right">{Number(ing.me || 0).toFixed(2)}</TableCell>
                                                                <TableCell align="right">{Number(ing.sk || 0).toFixed(2)}</TableCell>
                                                                <TableCell align="right">{Number(ing.lk || 0).toFixed(2)}</TableCell>
                                                                <TableCell align="right">{Number(ing.ca || 0).toFixed(2)}</TableCell>
                                                                <TableCell align="right">{Number(ing.p || 0).toFixed(2)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Tombol formulasi */}
                        <Stack direction="row">
                            <Button variant="contained" size="large" onClick={handleFormulate} disabled={loading}>
                                {loading ? 'Memproses…' : 'Formulasikan'}
                            </Button>
                        </Stack>
                    </Stack>
                </Grid>

                {/* Kolom kanan: hasil formulasi */}
                <Grid item xs={12} sm={6} md={6} sx={{ alignSelf: 'flex-start', minWidth: 0 }}>
                    <Card sx={{ position: { xs: 'static', sm: 'sticky' }, top: 16, maxHeight: { sm: 'calc(100vh - 32px)' }, overflowY: { sm: 'auto' } }}>
                        <CardContent>
                            <Typography variant="h6">Hasil Formulasi</Typography>
                            {result ? (
                                <>
                                    <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                                        <Chip label={`Skor Deviasi: ${result.result.toFixed(4)}`} size="small" />
                                        <Chip label={`Total Bahan: ${Object.values(result.ingredients).reduce((a,b)=>a+Number(b||0),0).toFixed(2)}%`} size="small" />
                                        <Chip label={`Jumlah Bahan: ${Object.entries(result.ingredients).filter(([_,v])=>Number(v)>0).length}`} size="small" />
                                    </Stack>
                                    <Tabs value={resultTab} onChange={(_,v)=>setResultTab(v)} sx={{ mb: 2 }}>
                                        <Tab value="tabel" label="Tabel" />
                                        <Tab value="grafik" label="Grafik" />
                                    </Tabs>

                                    {resultTab === 'tabel' ? (
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <Typography variant="subtitle1">Kebutuhan vs Hasil</Typography>
                                                <Divider sx={{ my: 1 }} />
                                                <TableContainer component={Paper} variant="outlined">
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Parameter</TableCell>
                                                                <TableCell>Target</TableCell>
                                                                <TableCell>Hasil</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell>PK (%)</TableCell>
                                                                <TableCell>{result.targetsDisplay.pk}</TableCell>
                                                                <TableCell>{result.achieved.pk.toFixed(2)}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell>ME</TableCell>
                                                                <TableCell>{result.targetsDisplay.me}</TableCell>
                                                                <TableCell>{result.achieved.me.toFixed(2)}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell>SK (%)</TableCell>
                                                                <TableCell>{result.targetsDisplay.sk}</TableCell>
                                                                <TableCell>{result.achieved.sk.toFixed(2)}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell>LK (%)</TableCell>
                                                                <TableCell>{result.targetsDisplay.lk}</TableCell>
                                                                <TableCell>{result.achieved.lk.toFixed(2)}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell>Ca (%)</TableCell>
                                                                <TableCell>{result.targetsDisplay.ca}</TableCell>
                                                                <TableCell>{result.achieved.ca.toFixed(2)}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell>P (%)</TableCell>
                                                                <TableCell>{result.targetsDisplay.p}</TableCell>
                                                                <TableCell>{result.achieved.p.toFixed(2)}</TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <Typography variant="subtitle1">Persentase Bahan</Typography>
                                                <Divider sx={{ my: 1 }} />
                                                <TableContainer component={Paper} variant="outlined">
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Bahan</TableCell>
                                                                <TableCell align="right">%</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {Object.entries(result.ingredients).map(([name, percentage]) => (
                                                                percentage > 0 ? (
                                                                    <TableRow key={name}>
                                                                        <TableCell>{name}</TableCell>
                                                                        <TableCell align="right">{percentage.toFixed(2)}</TableCell>
                                                                    </TableRow>
                                                                ) : null
                                                            ))}
                                                            <TableRow>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                                    {Object.values(result.ingredients).reduce((acc, v) => acc + Number(v || 0), 0).toFixed(2)}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Grid>
                                        </Grid>
                                    ) : (
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <Typography variant="subtitle1">Komposisi Bahan (Pie)</Typography>
                                                <Divider sx={{ my: 1 }} />
                                                <div style={{ width: '100%', height: 260 }}>
                                                    <ResponsiveContainer>
                                                        <PieChart>
                                                            <Pie
                                                                data={Object.entries(result.ingredients)
                                                                    .filter(([_, pct]) => Number(pct) > 0)
                                                                    .map(([name, pct]) => ({ name, value: Number(pct) }))}
                                                                dataKey="value"
                                                                nameKey="name"
                                                                cx="50%"
                                                                cy="50%"
                                                                outerRadius={100}
                                                                label
                                                            >
                                                                {Object.keys(result.ingredients).map((_, index) => (
                                                                    <Cell key={`cell-${index}`} fill={["#1976d2","#9c27b0","#2e7d32","#ff9800","#d32f2f","#00695c","#7b1fa2","#c0ca33"][index % 8]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip />
                                                            <Legend />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <Typography variant="subtitle1">Perbandingan Nutrisi (Radar)</Typography>
                                                <Divider sx={{ my: 1 }} />
                                                <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                                                    <ToggleButtonGroup
                                                        size="small"
                                                        value={radarMode}
                                                        exclusive
                                                        onChange={(_, v) => v && setRadarMode(v)}
                                                    >
                                                        <ToggleButton value="percent">Persentase</ToggleButton>
                                                        <ToggleButton value="absolute">Angka</ToggleButton>
                                                    </ToggleButtonGroup>
                                                </Stack>
                                                <div style={{ width: '100%', height: 260 }}>
                                                    <ResponsiveContainer>
                                                        {(() => {
                                                            const raw = [
                                                                { nutrient: 'PK', Target: Number(result.targetsDisplay.pk) || 0, Actual: Number(result.achieved.pk) || 0 },
                                                                { nutrient: 'ME', Target: Number(result.targetsDisplay.me) || 0, Actual: Number(result.achieved.me) || 0 },
                                                                { nutrient: 'SK', Target: Number(result.targetsDisplay.sk) || 0, Actual: Number(result.achieved.sk) || 0 },
                                                                { nutrient: 'LK', Target: Number(result.targetsDisplay.lk) || 0, Actual: Number(result.achieved.lk) || 0 },
                                                                { nutrient: 'Ca', Target: Number(result.targetsDisplay.ca) || 0, Actual: Number(result.achieved.ca) || 0 },
                                                                { nutrient: 'P', Target: Number(result.targetsDisplay.p) || 0, Actual: Number(result.achieved.p) || 0 },
                                                            ];
                                                            const dataPercent = raw.map(d => ({
                                                                nutrient: d.nutrient,
                                                                Target: d.Target > 0 ? 100 : 0,
                                                                Actual: d.Target > 0 ? Math.min((d.Actual / d.Target) * 100, 200) : 0,
                                                            }));
                                                            const dataAbsolute = raw;
                                                            const isPercent = radarMode === 'percent';
                                                            const chartData = isPercent ? dataPercent : dataAbsolute;
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
                                                                    <Radar name={isPercent ? 'Target (100%)' : 'Target'} dataKey="Target" stroke="#1976d2" strokeWidth={2} fill="#1976d2" fillOpacity={0.5} />
                                                                    <Radar name={isPercent ? 'Hasil (%)' : 'Hasil'} dataKey="Actual" stroke="#d32f2f" strokeWidth={2} fill="#d32f2f" fillOpacity={0.5} />
                                                                    <Legend />
                                                                    <Tooltip />
                                                                </RadarChart>
                                                            );
                                                        })()}
                                                    </ResponsiveContainer>
                                                </div>
                                            </Grid>
                                        </Grid>
                                    )}
                                </>
                            ) : (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Belum ada hasil. Pilih profil dan bahan, lalu tekan "Formulasikan".
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default AutomaticFeedFormulationPage;