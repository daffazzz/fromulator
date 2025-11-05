import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const SavedFormulationsPage = () => {
    const [formulations, setFormulations] = useState([]);
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        const fetchFormulations = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('saved_formulations')
                .select(`
                    *,
                    livestock_profiles(*),
                    formulation_details(*, ingredients(*))
                `)
                .eq('user_id', user.id);

            if (error) console.error('Error fetching formulations', error);
            else setFormulations(data);
        };

        fetchFormulations();
    }, []);

    const toggleExpand = (id) => {
        setExpanded(expanded === id ? null : id);
    };

    const handleDelete = async (id) => {
        // First, delete dependent rows in formulation_details
        const { error: detailsError } = await supabase
            .from('formulation_details')
            .delete()
            .eq('formulation_id', id);

        if (detailsError) {
            return console.error('Error deleting formulation details:', detailsError);
        }

        // Then, delete the row in saved_formulations
        const { error: mainError } = await supabase
            .from('saved_formulations')
            .delete()
            .eq('id', id);

        if (mainError) {
            console.error('Error deleting formulation:', mainError);
        } else {
            setFormulations(formulations.filter(f => f.id !== id));
        }
    };

    return (
        <div>
            <h2>Saved Formulations</h2>
            {formulations.map(formulation => (
                <div key={formulation.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                    <h3>{formulation.name}</h3>
                    <p><strong>Livestock:</strong> {formulation.livestock_profiles.species} - {formulation.livestock_profiles.type} - {formulation.livestock_profiles.stage}</p>
                    <button onClick={() => toggleExpand(formulation.id)}>
                        {expanded === formulation.id ? 'Collapse' : 'View Details'}
                    </button>
                    <button onClick={() => handleDelete(formulation.id)} style={{ marginLeft: '10px' }}>
                        Delete
                    </button>
                    {expanded === formulation.id && (
                        <div>
                            <h4>Formulation Details:</h4>
                            <ul>
                                {formulation.formulation_details.map(detail => (
                                    <li key={detail.id}>
                                        {detail.ingredients.name}: {detail.percentage}%
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default SavedFormulationsPage;