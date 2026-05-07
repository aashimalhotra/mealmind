import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getProfile, updateProfile } from '../api/profile';
import type { ProfileOut, ProfileUpdate, ProfileUserUpdate } from '../api/profile';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function Profile() {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
  });

  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    cuisine_pref: string;
    prep_days: string[];
    dineout_days: string[];
    users: Array<{
      id: string;
      calorie_target: number;
      protein_pct?: number;
      carbs_pct?: number;
      fat_pct?: number;
      veggie_target?: number;
    }>;
  }>({
    cuisine_pref: '',
    prep_days: [],
    dineout_days: [],
    users: [],
  });

  const handleStartEdit = () => {
    if (!profile) return;
    setEditForm({
      cuisine_pref: profile.household.cuisine_pref || '',
      prep_days: [...profile.household.prep_days],
      dineout_days: [...profile.household.dineout_days],
      users: profile.household.members.map(user => ({
        id: user.id,
        calorie_target: user.calorie_target,
        protein_pct: user.protein_pct,
        carbs_pct: user.carbs_pct,
        fat_pct: user.fat_pct,
        veggie_target: user.veggie_target,
      }))
    });
    setIsEditing(true);
  };

  const { mutate: updateProfileMutation, isPending: isUpdating } = useMutation({
    mutationFn: (data: ProfileUpdate) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
    }
  });

  const handleSave = () => {
    if (!profile) return;
    const updateData: ProfileUpdate = {};
    const currentCuisinePref = profile.household.cuisine_pref || '';
    if (editForm.cuisine_pref !== currentCuisinePref) {
      updateData.cuisine_pref = editForm.cuisine_pref;
    }
    if (JSON.stringify(editForm.prep_days) !== JSON.stringify(profile.household.prep_days)) {
      updateData.prep_days = editForm.prep_days;
    }
    if (JSON.stringify(editForm.dineout_days) !== JSON.stringify(profile.household.dineout_days)) {
      updateData.dineout_days = editForm.dineout_days;
    }
    const userUpdates = editForm.users.map(editUser => {
      const originalUser = profile.household.members.find(u => u.id === editUser.id);
      if (!originalUser) return null;
      const updates: ProfileUserUpdate = { id: editUser.id };
      if (editUser.calorie_target !== originalUser.calorie_target) updates.calorie_target = editUser.calorie_target;
      if (editUser.protein_pct !== originalUser.protein_pct) updates.protein_pct = editUser.protein_pct;
      if (editUser.carbs_pct !== originalUser.carbs_pct) updates.carbs_pct = editUser.carbs_pct;
      if (editUser.fat_pct !== originalUser.fat_pct) updates.fat_pct = editUser.fat_pct;
      if (editUser.veggie_target !== originalUser.veggie_target) updates.veggie_target = editUser.veggie_target;
      return Object.keys(updates).length > 1 ? updates : null;
    }).filter(Boolean) as ProfileUserUpdate[];
    if (userUpdates.length > 0) {
      updateData.users = userUpdates;
    }
    if (Object.keys(updateData).length > 0) {
      updateProfileMutation(updateData);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="p-page">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Profile</h1>
        <div className="space-y-3">
          <div className="h-20 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-32 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-page text-text-primary">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <p className="text-red-500">Failed to load profile: {error.message}</p>
        <Link to="/" className="text-primary underline mt-4 block">Back to Dashboard</Link>
      </div>
    );
  }

  const household = profile?.household;

  return (
    <div className="p-page text-text-primary">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      {!isEditing ? (
        <button
          onClick={handleStartEdit}
          className="mb-6 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          Edit Profile
        </button>
      ) : (
        <div className="mb-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )}
      
      {household && (
        <div className="space-y-6">
          {/* Household Section */}
          <section className="bg-surface p-4 rounded-xl border border-border">
            <h2 className="text-xl font-semibold mb-3">Household</h2>
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-text-secondary">Name</span>
                  <span>{household.name}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-text-secondary">Cuisine Preference</label>
                  <input
                    type="text"
                    value={editForm.cuisine_pref}
                    onChange={(e) => setEditForm(prev => ({ ...prev, cuisine_pref: e.target.value }))}
                    className="p-2 border border-border rounded-lg"
                    placeholder="e.g. italian, mexican"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-text-secondary">Prep Days</span>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => (
                      <label key={day} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={editForm.prep_days.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditForm(prev => ({ ...prev, prep_days: [...prev.prep_days, day] }));
                            } else {
                              setEditForm(prev => ({ ...prev, prep_days: prev.prep_days.filter(d => d !== day) }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-text-secondary">Dine-out Days</span>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => (
                      <label key={day} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={editForm.dineout_days.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditForm(prev => ({ ...prev, dineout_days: [...prev.dineout_days, day] }));
                            } else {
                              setEditForm(prev => ({ ...prev, dineout_days: prev.dineout_days.filter(d => d !== day) }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Name</span>
                  <span>{household.name}</span>
                </div>
                {household.cuisine_pref && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Cuisine Preference</span>
                    <span>{household.cuisine_pref}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-secondary">Prep Days</span>
                  <span>{household.prep_days.join(', ') || 'None set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Dine-out Days</span>
                  <span>{household.dineout_days.join(', ') || 'None set'}</span>
                </div>
              </div>
            )}
          </section>

          {/* Members Section */}
          <section className="bg-surface p-4 rounded-xl border border-border">
            <h2 className="text-xl font-semibold mb-3">Members</h2>
            <div className="space-y-4">
              {household.members.map((user) => {
                const editUser = editForm.users.find(u => u.id === user.id);
                return (
                  <div key={user.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <h3 className="font-medium">{user.name}</h3>
                    {isEditing && editUser ? (
                      <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                        <div className="flex flex-col gap-1">
                          <label className="text-text-secondary">Calorie Target</label>
                          <input
                            type="number"
                            value={editUser.calorie_target}
                            onChange={(e) => setEditForm(prev => ({
                              ...prev,
                              users: prev.users.map(u => u.id === user.id ? { ...u, calorie_target: Number(e.target.value) } : u)
                            }))}
                            className="p-2 border border-border rounded-lg"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-text-secondary">Protein %</label>
                          <input
                            type="number"
                            value={editUser.protein_pct || ''}
                            onChange={(e) => setEditForm(prev => ({
                              ...prev,
                              users: prev.users.map(u => u.id === user.id ? { ...u, protein_pct: e.target.value ? Number(e.target.value) : undefined } : u)
                            }))}
                            className="p-2 border border-border rounded-lg"
                            placeholder="Optional"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-text-secondary">Carbs %</label>
                          <input
                            type="number"
                            value={editUser.carbs_pct || ''}
                            onChange={(e) => setEditForm(prev => ({
                              ...prev,
                              users: prev.users.map(u => u.id === user.id ? { ...u, carbs_pct: e.target.value ? Number(e.target.value) : undefined } : u)
                            }))}
                            className="p-2 border border-border rounded-lg"
                            placeholder="Optional"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-text-secondary">Fat %</label>
                          <input
                            type="number"
                            value={editUser.fat_pct || ''}
                            onChange={(e) => setEditForm(prev => ({
                              ...prev,
                              users: prev.users.map(u => u.id === user.id ? { ...u, fat_pct: e.target.value ? Number(e.target.value) : undefined } : u)
                            }))}
                            className="p-2 border border-border rounded-lg"
                            placeholder="Optional"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-text-secondary">Veggie Target (servings)</label>
                          <input
                            type="number"
                            value={editUser.veggie_target || ''}
                            onChange={(e) => setEditForm(prev => ({
                              ...prev,
                              users: prev.users.map(u => u.id === user.id ? { ...u, veggie_target: e.target.value ? Number(e.target.value) : undefined } : u)
                            }))}
                            className="p-2 border border-border rounded-lg"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Calorie Target</span>
                          <span>{user.calorie_target} cal</span>
                        </div>
                        {user.protein_pct && (
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Protein</span>
                            <span>{user.protein_pct}%</span>
                          </div>
                        )}
                        {user.carbs_pct && (
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Carbs</span>
                            <span>{user.carbs_pct}%</span>
                          </div>
                        )}
                        {user.fat_pct && (
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Fat</span>
                            <span>{user.fat_pct}%</span>
                          </div>
                        )}
                        {user.veggie_target && (
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Veggie Target</span>
                            <span>{user.veggie_target} servings</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <Link to="/" className="text-primary underline block text-center">Back to Dashboard</Link>
        </div>
      )}
    </div>
  );
}
