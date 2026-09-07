import React from 'react';
import { ApprovalRequest, FullProjectResponse } from '../../types/api';
import { RequirementsReviewCard } from './RequirementsReviewCard';
import { DesignReviewCard } from './DesignReviewCard';

interface ApprovalCardProps {
  approval: ApprovalRequest;
  project: FullProjectResponse;
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
  isLoading?: boolean;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  project,
  onApprove,
  onRequestChanges,
  isLoading = false,
}) => {
  const isRequirements = approval.artifactType === 'requirements';
  const latestBaseline = project.requirementBaselines?.find(rb => rb.id === approval.artifactId) || project.requirementBaselines?.[0];
  const latestDesign = project.designSpecs?.find(ds => ds.id === approval.artifactId) || project.designSpecs?.[0];

  if (isRequirements && latestBaseline) {
    return (
      <RequirementsReviewCard
        baseline={latestBaseline}
        project={project}
        onApprove={onApprove}
        onRequestChanges={onRequestChanges}
        isLoading={isLoading}
      />
    );
  }

  if (!isRequirements && latestDesign) {
    return (
      <DesignReviewCard
        designSpec={latestDesign}
        project={project}
        onApprove={onApprove}
        onRequestChanges={onRequestChanges}
        isLoading={isLoading}
      />
    );
  }

  return null;
};
