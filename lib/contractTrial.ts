import type { PricingMatrixPayload } from "@/lib/pricingMatrix";
import {
  effectiveRevenueYenPerCourse,
  effectiveVariableCostPerContractYen,
} from "@/lib/pricingMatrix";

export type CourseTrialRow = {
  courseId: string;
  name: string;
  /** 表示・売上試算に使った単価（null なら標準単価フォールバック） */
  revenueUnitYen: number | null;
  targetCount: number;
  rowRevenueYen: number;
  variableTotalYen: number;
};

export function buildCourseTrialRows(
  matrix: PricingMatrixPayload,
  targetsByCourseId: Map<string, number>,
  defaultUnitYen: number,
  globalVariableCostPerContractYen: number,
): CourseTrialRow[] {
  return matrix.courses.map((c) => {
    const revenueUnitYen = effectiveRevenueYenPerCourse(matrix, c.id);
    const unit = revenueUnitYen ?? defaultUnitYen;
    const targetCount = targetsByCourseId.get(c.id) ?? 0;
    const effVar = effectiveVariableCostPerContractYen(
      c.variableCostPerContractYen,
      globalVariableCostPerContractYen,
    );
    return {
      courseId: c.id,
      name: c.name,
      revenueUnitYen,
      targetCount,
      rowRevenueYen: targetCount * unit,
      variableTotalYen: targetCount * effVar,
    };
  });
}

export function sumPlanTargetCounts(rows: CourseTrialRow[]) {
  return rows.reduce((s, r) => s + r.targetCount, 0);
}

export function planBasedGoalRevenueYenFromRows(rows: CourseTrialRow[]) {
  return rows.reduce((s, r) => s + r.rowRevenueYen, 0);
}

export function planBasedGoalVariableTotalYenFromRows(rows: CourseTrialRow[]) {
  return rows.reduce((s, r) => s + r.variableTotalYen, 0);
}

export function profitAfterCostsYen(
  revenueYen: number,
  contractCount: number,
  fixedYen: number,
  variablePerContractYen: number,
) {
  return revenueYen - fixedYen - contractCount * variablePerContractYen;
}

export function profitAfterFixedAndVariableTotal(revenueYen: number, fixedYen: number, variableTotalYen: number) {
  return revenueYen - fixedYen - variableTotalYen;
}
