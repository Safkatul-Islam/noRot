import type { InterventionEvent } from '@norot/shared';

let activeIntervention: InterventionEvent | null = null;

export function setActiveIntervention(event: InterventionEvent): void {
  activeIntervention = event;
}

export function clearActiveIntervention(interventionId?: string): void {
  if (!interventionId) {
    activeIntervention = null;
    return;
  }
  if (activeIntervention?.id === interventionId) {
    activeIntervention = null;
  }
}

export function getActiveIntervention(): InterventionEvent | null {
  return activeIntervention;
}
