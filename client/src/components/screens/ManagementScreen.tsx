import React, { useMemo, useState } from 'react';
import { Plus, Trash2, MapPin, Sprout, AlertCircle } from 'lucide-react';
import { ScreenType, SUPPORTED_CROPS, SupportedCrop } from '../../types';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { INDIA_LOCATIONS } from '../../data/indiaLocationData';
import { BackButton } from '../common/BackButton';

interface ManagementScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

const selectClass =
  'w-full px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-emerald-600';
const inputClass =
  'w-full px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600';

export const ManagementScreen: React.FC<ManagementScreenProps> = ({ onNavigate }) => {
  const { isDemo } = useAuth();
  const { farms, activeFarm, setActiveFarmId, createFarm, deleteFarm, createField, deleteField, locationLabel } =
    useFarm();
  const { showToast } = useToast();

  const [farmForm, setFarmForm] = useState({
    name: '',
    state: '',
    district: '',
    totalAreaAcres: '',
  });
  const [fieldForm, setFieldForm] = useState({
    name: '',
    areaAcres: '',
    crop: 'tomato' as SupportedCrop,
    variety: '',
    growthStage: '',
    soilType: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const districts = useMemo(() => {
    return INDIA_LOCATIONS.find((s) => s.state === farmForm.state)?.districts ?? [];
  }, [farmForm.state]);

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isDemo) {
      setError('Demo workspace cannot create farms. Sign up for a real account.');
      return;
    }
    if (!farmForm.name.trim() || !farmForm.state || !farmForm.district) {
      setError('Farm name, state, and district are required.');
      return;
    }
    setBusy(true);
    try {
      const farm = await createFarm({
        name: farmForm.name.trim(),
        state: farmForm.state,
        district: farmForm.district,
        totalAreaAcres: Number(farmForm.totalAreaAcres) || 0,
      });
      setFarmForm({ name: '', state: '', district: '', totalAreaAcres: '' });
      showToast(`Created farm ${farm.name}.`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create farm.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isDemo) {
      setError('Demo workspace cannot add fields. Sign up for a real account.');
      return;
    }
    if (!activeFarm) {
      setError('Select or create a farm first.');
      return;
    }
    if (!fieldForm.name.trim() || !fieldForm.areaAcres) {
      setError('Field name and area are required.');
      return;
    }
    setBusy(true);
    try {
      await createField({
        name: fieldForm.name.trim(),
        areaAcres: Number(fieldForm.areaAcres),
        crop: fieldForm.crop,
        variety: fieldForm.variety,
        growthStage: fieldForm.growthStage,
        soilType: fieldForm.soilType,
        soilMoisture: 30,
      });
      setFieldForm({
        name: '',
        areaAcres: '',
        crop: 'tomato',
        variety: '',
        growthStage: '',
        soilType: '',
      });
      showToast('Field added.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add field.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="pb-2 border-b border-slate-200/80 dark:border-slate-800 space-y-1">
        <BackButton label="Back to Dashboard" onClick={() => onNavigate('dashboard')} />
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Farm Management
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Add or remove farms and fields. Supported crops: Pepper Bell, Potato, Tomato.
        </p>
      </div>

      {isDemo && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          Demo mode shows sample farms only. Create a real account to manage your own farms and fields.
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Farms */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Your Farms</h2>
            <div className="space-y-2 mb-4">
              {farms.length === 0 ? (
                <p className="text-xs text-slate-500">No farms yet. Create one below.</p>
              ) : (
                farms.map((f) => (
                  <div
                    key={f.id}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-md border text-xs ${
                      activeFarm?.id === f.id
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFarmId(f.id)}
                      className="text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{f.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {f.location}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {f.plots.length} field(s)
                        {f.totalAcres > 0 ? ` · ${f.totalAcres} ac` : ''}
                      </div>
                    </button>
                    {!isDemo && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          if (!confirm(`Delete farm "${f.name}" and all its fields?`)) return;
                          setBusy(true);
                          setError(null);
                          try {
                            await deleteFarm(f.id);
                            showToast('Farm deleted.', 'info');
                          } catch (err) {
                            const msg = err instanceof Error ? err.message : 'Failed to delete farm.';
                            setError(msg);
                            showToast(msg, 'error');
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCreateFarm} className="space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add farm
              </div>
              <input
                className={inputClass}
                placeholder="Farm name"
                value={farmForm.name}
                onChange={(e) => setFarmForm((p) => ({ ...p, name: e.target.value }))}
                disabled={busy || isDemo}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className={selectClass}
                  value={farmForm.state}
                  onChange={(e) => setFarmForm((p) => ({ ...p, state: e.target.value, district: '' }))}
                  disabled={busy || isDemo}
                >
                  <option value="">State</option>
                  {INDIA_LOCATIONS.map((s) => (
                    <option key={s.state} value={s.state}>
                      {s.state}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  value={farmForm.district}
                  onChange={(e) => setFarmForm((p) => ({ ...p, district: e.target.value }))}
                  disabled={busy || isDemo || !farmForm.state}
                >
                  <option value="">District</option>
                  {districts.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.1"
                placeholder="Total acres (optional)"
                value={farmForm.totalAreaAcres}
                onChange={(e) => setFarmForm((p) => ({ ...p, totalAreaAcres: e.target.value }))}
                disabled={busy || isDemo}
              />
              <button
                type="submit"
                disabled={busy || isDemo}
                className="w-full py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                Create Farm
              </button>
            </form>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Fields</h2>
            <p className="text-[11px] text-slate-500 mb-3">
              Active: {activeFarm?.name || 'None'} {locationLabel ? `· ${locationLabel}` : ''}
            </p>

            <div className="space-y-2 mb-4">
              {!activeFarm || activeFarm.plots.length === 0 ? (
                <p className="text-xs text-slate-500">No fields on this farm yet.</p>
              ) : (
                activeFarm.plots.map((plot) => (
                  <div
                    key={plot.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                        {plot.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {SUPPORTED_CROPS.find((c) => c.value === plot.crop)?.label || plot.crop}
                        {plot.variety ? ` · ${plot.variety}` : ''}
                        {plot.acres > 0 ? ` · ${plot.acres} ac` : ''}
                      </div>
                      {plot.growthStage && (
                        <div className="text-[11px] text-slate-400">{plot.growthStage}</div>
                      )}
                    </div>
                    {!isDemo && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          if (!confirm(`Remove field "${plot.name}"?`)) return;
                          setBusy(true);
                          setError(null);
                          try {
                            await deleteField(plot.id);
                            showToast('Field removed.', 'info');
                          } catch (err) {
                            const msg = err instanceof Error ? err.message : 'Failed to remove field.';
                            setError(msg);
                            showToast(msg, 'error');
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCreateField} className="space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add field
              </div>
              <input
                className={inputClass}
                placeholder="Field name"
                value={fieldForm.name}
                onChange={(e) => setFieldForm((p) => ({ ...p, name: e.target.value }))}
                disabled={busy || isDemo || !activeFarm}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Acres"
                  value={fieldForm.areaAcres}
                  onChange={(e) => setFieldForm((p) => ({ ...p, areaAcres: e.target.value }))}
                  disabled={busy || isDemo || !activeFarm}
                />
                <select
                  className={selectClass}
                  value={fieldForm.crop}
                  onChange={(e) => setFieldForm((p) => ({ ...p, crop: e.target.value as SupportedCrop }))}
                  disabled={busy || isDemo || !activeFarm}
                >
                  {SUPPORTED_CROPS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className={inputClass}
                placeholder="Variety (optional)"
                value={fieldForm.variety}
                onChange={(e) => setFieldForm((p) => ({ ...p, variety: e.target.value }))}
                disabled={busy || isDemo || !activeFarm}
              />
              <input
                className={inputClass}
                placeholder="Growth stage (optional)"
                value={fieldForm.growthStage}
                onChange={(e) => setFieldForm((p) => ({ ...p, growthStage: e.target.value }))}
                disabled={busy || isDemo || !activeFarm}
              />
              <input
                className={inputClass}
                placeholder="Soil type (optional)"
                value={fieldForm.soilType}
                onChange={(e) => setFieldForm((p) => ({ ...p, soilType: e.target.value }))}
                disabled={busy || isDemo || !activeFarm}
              />
              <button
                type="submit"
                disabled={busy || isDemo || !activeFarm}
                className="w-full py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                Add Field
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
