import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPlan, approvePlan } from '../api/plans';
import type { PlanOut } from '../api/plans';
import PlanWeekGrid from '../components/PlanWeekGrid';

const PlanReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: plan, isLoading, isError, error } = useQuery<PlanOut, Error>({
    queryKey: ['plan', id],
    queryFn: () => getPlan(id!),
    enabled: !!id,
  });

  const handleApprove = async () => {
    if (!id) return;
    try {
      await approvePlan(id);
      navigate('/');
    } catch (err) {
      console.error('Failed to approve plan:', err);
      alert('Failed to approve plan. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <h2 className="text-heading-md font-medium text-text-primary mb-2">Error loading plan</h2>
        <p className="text-body-sm text-text-tertiary mb-6">{error?.message || 'Plan not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="py-3 px-6 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-[var(--page-padding)] py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-text-secondary hover:text-text-primary"
          >
            ← Back
          </button>
          <h1 className="text-heading-md font-medium text-text-primary m-0">Review Your Plan</h1>
          <div className="w-6" /> {/* Spacer for alignment */}
        </div>

        <p className="text-body-sm text-text-tertiary mb-6">
          Week of {new Date(plan.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>

        <PlanWeekGrid planData={plan.plan_data} />

        <div className="flex gap-3 mt-8">
          <button
            disabled
            className="flex-1 py-3 px-6 bg-gray-100 text-text-tertiary rounded-xl font-medium cursor-not-allowed"
            title="Available in Sprint 7"
          >
            Tweak (chat)
          </button>
          <button
            onClick={handleApprove}
            className="flex-1 py-3 px-6 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Approve & save
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanReview;
