import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const IngredientForm = ({ ingredient, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        pk: '',
        me: '',
        sk: '',
        lk: '',
        ca: '',
        p: ''
    });

    useEffect(() => {
        if (ingredient) {
            setFormData(ingredient);
        }
    }, [ingredient]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { error } = ingredient
            ? await supabase.from('ingredients').update(formData).eq('id', ingredient.id)
            : await supabase.from('ingredients').insert(formData);

        if (error) {
            console.error('Error saving ingredient:', error);
        } else {
            onClose();
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <h2>{ingredient ? 'Edit' : 'Add'} Ingredient</h2>
                <form onSubmit={handleSubmit}>
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" required />
                    <input name="pk" value={formData.pk} onChange={handleChange} placeholder="PK (%)" type="number" step="0.01" />
                    <input name="me" value={formData.me} onChange={handleChange} placeholder="ME (kcal/kg)" type="number" step="0.01" />
                    <input name="sk" value={formData.sk} onChange={handleChange} placeholder="SK (%)" type="number" step="0.01" />
                    <input name="lk" value={formData.lk} onChange={handleChange} placeholder="LK (%)" type="number" step="0.01" />
                    <input name="ca" value={formData.ca} onChange={handleChange} placeholder="Ca (%)" type="number" step="0.01" />
                    <input name="p" value={formData.p} onChange={handleChange} placeholder="P (%)" type="number" step="0.01" />
                    <button type="submit">Save</button>
                    <button type="button" onClick={onClose}>Cancel</button>
                </form>
            </div>
        </div>
    );
};

export default IngredientForm;