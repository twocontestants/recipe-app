import { afterEach } from 'vitest';
import { resetPlannerMealCache } from '@/lib/plannerMealCache';

afterEach(() => {
  resetPlannerMealCache();
});
