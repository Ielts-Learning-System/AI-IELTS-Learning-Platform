import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Check,
  CircleDollarSign,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useUserStore } from '../../store/useUserStore';
import type { BillingPlan, PlanSkill } from './useAdminBilling';
import { useAdminBilling } from './useAdminBilling';

const ALL_SKILLS: PlanSkill[] = ['reading', 'listening', 'writing', 'speaking'];

type PlanFormData = {
  code: string;
  name: string;
  price: number;
  durationMonths: number;
  isActive: boolean;
  features: string[];
  benefits: {
    skills: PlanSkill[];
  };
  ui: {
    borderColor: string;
    buttonText: string;
    buttonColor: string;
    badge: string;
  };
};

const emptyForm: PlanFormData = {
  code: '',
  name: '',
  price: 0,
  durationMonths: 1,
  isActive: true,
  features: [],
  benefits: { skills: [] },
  ui: {
    borderColor: '',
    buttonText: '',
    buttonColor: '',
    badge: '',
  },
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price || 0);

const skillLabel = (value: PlanSkill) => value.charAt(0).toUpperCase() + value.slice(1);

export function BillingPlansManagement() {
  const { token } = useUserStore();
  const { fetchPlans, createPlan, updatePlan, togglePlanActive } = useAdminBilling(token);

  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm);
  const [featureInput, setFeatureInput] = useState('');
  const [showUiCustomization, setShowUiCustomization] = useState(false);

  const isEditing = useMemo(() => !!editingPlanId, [editingPlanId]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await fetchPlans();
      setPlans(data);
    } catch (error) {
      console.error(error);
      toast.error('Unable to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlanId(null);
    setForm(emptyForm);
    setFeatureInput('');
    setShowUiCustomization(false);
    setOpenModal(true);
  };

  const openEditModal = (plan: BillingPlan) => {
    setEditingPlanId(plan._id);
    setForm({
      code: plan.code || '',
      name: plan.name || '',
      price: Number(plan.price || 0),
      durationMonths: Number(plan.durationMonths || 1),
      isActive: !!plan.isActive,
      features: (plan.features || []).filter((feature) => !!feature?.trim()),
      benefits: {
        skills: (plan.benefits?.skills || []) as PlanSkill[],
      },
      ui: {
        borderColor: plan.ui?.borderColor || '',
        buttonText: plan.ui?.buttonText || '',
        buttonColor: plan.ui?.buttonColor || '',
        badge: plan.ui?.badge || '',
      },
    });
    setFeatureInput('');
    setShowUiCustomization(
      Boolean(plan.ui?.borderColor || plan.ui?.buttonText || plan.ui?.buttonColor || plan.ui?.badge)
    );
    setOpenModal(true);
  };

  const closeModal = () => {
    if (!submitting) setOpenModal(false);
  };

  const addFeature = () => {
    const nextFeature = featureInput.trim();
    if (!nextFeature) return;

    setForm((prev) => ({
      ...prev,
      features: [...prev.features, nextFeature],
    }));
    setFeatureInput('');
  };

  const removeFeature = (indexToRemove: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, index) => index !== indexToRemove),
    }));
  };

  const toggleSkill = (skill: PlanSkill) => {
    setForm((prev) => {
      const hasSkill = prev.benefits.skills.includes(skill);
      return {
        ...prev,
        benefits: {
          skills: hasSkill
            ? prev.benefits.skills.filter((item) => item !== skill)
            : [...prev.benefits.skills, skill],
        },
      };
    });
  };

  const submitPlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!form.code.trim() || !form.name.trim()) {
        toast.error('Please provide plan code and name');
        return;
      }

      if (!form.benefits.skills.length) {
        toast.error('Select at least one skill');
        return;
      }

      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        price: Number(form.price),
        durationMonths: Number(form.durationMonths),
        isActive: form.isActive,
        features: form.features.map((item) => item.trim()).filter(Boolean),
        benefits: {
          skills: form.benefits.skills,
        },
        ui: {
          borderColor: form.ui.borderColor.trim(),
          buttonText: form.ui.buttonText.trim(),
          buttonColor: form.ui.buttonColor.trim(),
          badge: form.ui.badge.trim(),
        },
      };

      if (isEditing && editingPlanId) {
        await updatePlan(editingPlanId, payload);
        toast.success('Plan updated successfully');
      } else {
        await createPlan(payload);
        toast.success('Plan created successfully');
      }

      setOpenModal(false);
      await loadPlans();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePlan = async (planId: string) => {
    setTogglingId(planId);
    try {
      await togglePlanActive(planId);
      toast.success('Plan status updated');
      await loadPlans();
    } catch (error) {
      console.error(error);
      toast.error('Could not toggle plan status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Billing Admin
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Plans Management</h1>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" />
            Add New Plan
          </button>
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          Loading plans...
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-slate-800">No plans found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const skills = plan.benefits?.skills || [];
            const toggling = togglingId === plan._id;

            return (
              <article
                key={plan._id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{plan.code}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-sm text-slate-700">
                  <p className="flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">{formatPrice(plan.price)}</span>
                  </p>
                  <p>
                    Duration:{' '}
                    <span className="font-semibold text-slate-900">{plan.durationMonths} months</span>
                  </p>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Allowed Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.length ? (
                        skills.map((skill) => (
                          <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {skillLabel(skill as PlanSkill)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">No skills</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    onClick={() => handleTogglePlan(plan._id)}
                    disabled={toggling}
                    className={`inline-flex min-w-28 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white transition ${
                      plan.isActive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                    } disabled:opacity-70`}
                  >
                    {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {plan.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Plan' : 'Add New Plan'}</h3>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitPlan} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Plan Code</span>
                  <input
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Plan Name</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Price (VND)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Duration (Months)</span>
                  <input
                    type="number"
                    min={1}
                    value={form.durationMonths}
                    onChange={(e) => setForm((prev) => ({ ...prev, durationMonths: Number(e.target.value) }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                    required
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Allowed Skills</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ALL_SKILLS.map((skill) => {
                    const selected = form.benefits.skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          selected
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {selected ? <Check className="h-4 w-4" /> : null}
                        {skillLabel(skill)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Features</p>
                  <p className="text-xs text-slate-500">Add user-facing benefits for this plan.</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                    placeholder="Example: Reading: Khong gioi han"
                    className="h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>

                {form.features.length ? (
                  <ul className="space-y-2">
                    {form.features.map((feature, index) => (
                      <li
                        key={`${feature}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <span className="text-sm text-slate-700">{feature}</span>
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No features added yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUiCustomization((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">UI Customization (Optional)</p>
                    <p className="text-xs text-slate-500">Configure badge and button style metadata.</p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 transition-transform ${
                      showUiCustomization ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showUiCustomization ? (
                  <div className="grid grid-cols-1 gap-3 border-t border-slate-200 px-4 py-4 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">UI Border Color</span>
                      <input
                        value={form.ui.borderColor}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            ui: { ...prev.ui, borderColor: e.target.value },
                          }))
                        }
                        placeholder="emerald"
                        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">UI Button Text</span>
                      <input
                        value={form.ui.buttonText}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            ui: { ...prev.ui, buttonText: e.target.value },
                          }))
                        }
                        placeholder="Dang ky ngay"
                        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">UI Button Color</span>
                      <input
                        value={form.ui.buttonColor}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            ui: { ...prev.ui, buttonColor: e.target.value },
                          }))
                        }
                        placeholder="emerald"
                        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">UI Badge</span>
                      <input
                        value={form.ui.badge}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            ui: { ...prev.ui, badge: e.target.value },
                          }))
                        }
                        placeholder="Pho bien"
                        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Set plan as active
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isEditing ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
