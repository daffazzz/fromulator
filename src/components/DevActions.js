import { useState } from 'react';
import { supabase } from '../utils/supabase';

const DevActions = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');

    const seedIngredients = async () => {
        setLoading(true);
        setResult('');

        const ingredients = [
            { name: 'Jagung', pk: 8.5, me: 3300, sk: 3.0, lk: 4.0, ca: 0.02, p: 0.28 },
            { name: 'Dedak Padi', pk: 12.0, me: 2800, sk: 12.0, lk: 12.0, ca: 0.05, p: 1.20 },
            { name: 'Bungkil Kedelai', pk: 45.0, me: 2230, sk: 1.0, lk: 3.0, ca: 0.25, p: 0.65 },
            { name: 'Tepung Ikan', pk: 60.0, me: 2850, sk: 8.0, lk: 8.0, ca: 5.0, p: 3.0 },
            { name: 'Minyak Sawit', pk: 0, me: 8800, sk: 0, lk: 99.0, ca: 0, p: 0 },
            { name: 'Kalsium Karbonat', pk: 0, me: 0, sk: 0, lk: 0, ca: 38.0, p: 0 },
            { name: 'Monokalsium Fosfat', pk: 0, me: 0, sk: 0, lk: 0, ca: 16.0, p: 21.0 }
        ];

        // To avoid re-inserting, let's check if data exists.
        const { data: existingData, error: fetchError } = await supabase.from('ingredients').select('id').limit(1);

        if (fetchError) {
            setResult(`Error checking for existing ingredients: ${fetchError.message}`);
            setLoading(false);
            return;
        }

        if (existingData && existingData.length > 0) {
            setResult('Ingredients table already has data. Seeding skipped.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.from('ingredients').insert(ingredients);

        if (error) {
            setResult(`Error seeding ingredients: ${error.message}`);
        } else {
            setResult('Successfully seeded ingredients!');
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '5px', marginTop: '20px' }}>
            <h3>Developer Actions</h3>
            <p>Use this button to seed the initial ingredient data into your database.</p>
            <button onClick={seedIngredients} disabled={loading}>
                {loading ? 'Seeding...' : 'Seed Ingredients Data'}
            </button>
            {result && <p>{result}</p>}
        </div>
    );
};

export default DevActions;