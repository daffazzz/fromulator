import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const LivestockProfileForm = ({ profile, onClose }) => {
    const [formData, setFormData] = useState({
        species: '',
        type: '',
        stage: '',
        pk_target: '',
        me_target: '',
        sk_target: '',
        lk_target: '',
        ca_target: '',
        p_target: ''
    });

    useEffect(() => {
        const fetchNeeds = async () => {
            if (profile && profile.id) {
                const { data: needs, error } = await supabase
                    .from('livestock_needs')
                    .select('*')
                    .eq('profile_id', profile.id)
                    .single();

                if (error) {
                    console.error('Error fetching livestock needs:', error);
                } else {
                    setFormData({ ...profile, ...needs });
                }
            } else {
                setFormData({
                    species: '', type: '', stage: '', pk_target: '',
                    me_target: '', sk_target: '', lk_target: '', ca_target: '', p_target: ''
                });
            }
        };
        fetchNeeds();
    }, [profile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        const profileData = {
            species: formData.species,
            type: formData.type,
            stage: formData.stage,
            user_id: user.id
        };

        let profileId = profile ? profile.id : null;

        if (profile) {
            const { error } = await supabase.from('livestock_profiles').update(profileData).eq('id', profile.id);
            if (error) return console.error('Error updating profile:', error);
        } else {
            const { data, error } = await supabase.from('livestock_profiles').insert(profileData).select().single();
            if (error) return console.error('Error inserting profile:', error);
            profileId = data.id;
        }

        const needsData = {
            profile_id: profileId,
            pk_target: formData.pk_target,
            me_target: formData.me_target,
            sk_target: formData.sk_target,
            lk_target: formData.lk_target,
            ca_target: formData.ca_target,
            p_target: formData.p_target,
        };

        const { error: needsError } = profile && profile.id
            ? await supabase.from('livestock_needs').update(needsData).eq('profile_id', profileId)
            : await supabase.from('livestock_needs').insert(needsData);
        
        if (needsError) {
            console.error('Error saving livestock needs:', needsError);
        } else {
            onClose();
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <h2>{profile ? 'Edit' : 'Add'} Livestock Profile</h2>
                <form onSubmit={handleSubmit}>
                    <input name="species" value={formData.species} onChange={handleChange} placeholder="Species" required />
                    <input name="type" value={formData.type} onChange={handleChange} placeholder="Type" required />
                    <input name="stage" value={formData.stage} onChange={handleChange} placeholder="Stage" required />
                    <h3>Nutritional Needs</h3>
                    <input type="number" name="pk_target" value={formData.pk_target} onChange={handleChange} placeholder="Protein Kasar (%)" required />
                    <input type="number" name="me_target" value={formData.me_target} onChange={handleChange} placeholder="Energi Metabolik (kkal/kg)" required />
                    <input type="number" name="sk_target" value={formData.sk_target} onChange={handleChange} placeholder="Serat Kasar (%)" required />
                    <input type="number" name="lk_target" value={formData.lk_target} onChange={handleChange} placeholder="Lemak Kasar (%)" required />
                    <input type="number" name="ca_target" value={formData.ca_target} onChange={handleChange} placeholder="Kalsium (%)" required />
                    <input type="number" name="p_target" value={formData.p_target} onChange={handleChange} placeholder="Fosfor (%)" required />
                    <button type="submit">Save</button>
                    <button type="button" onClick={onClose}>Cancel</button>
                </form>
            </div>
        </div>
    );
};

export default LivestockProfileForm;