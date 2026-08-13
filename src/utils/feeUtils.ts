/**
 * Calculates the total fees owed by a member from their join year up to the current year.
 * Every calendar year the member is registered counts as one full yearlyFee — no proration.
 *
 * @param joinedAt  - Timestamp when the member was registered
 * @param yearlyFee - Yearly fee rate assigned to the member (default 1200 BDT)
 * @returns Total BDT fee amount owed from join year through current year
 */
export const calculateTotalDues = (joinedAt: number, yearlyFee: number | undefined): number => {
  if (!yearlyFee || yearlyFee <= 0) return 0;

  const joinYear = new Date(joinedAt).getFullYear();
  const currentYear = new Date().getFullYear();

  // Each calendar year (including the join year) = one full yearlyFee
  const years = Math.max(1, currentYear - joinYear + 1);
  return years * yearlyFee;
};

/**
 * Calculates the fee expected for a specific calendar year.
 * Returns the full yearlyFee for any year the member is/was active.
 * Returns 0 only if the member had not yet joined in that year.
 *
 * @param joinedAt   - Timestamp when the member joined
 * @param yearlyFee  - Yearly fee rate assigned to the member
 * @param targetYear - The year to calculate the fee for
 * @returns Full yearlyFee if member was/is/will be active that year, else 0
 */
export const calculateYearlyDues = (joinedAt: number, yearlyFee: number | undefined, targetYear: number): number => {
  if (!yearlyFee || yearlyFee <= 0) return 0;

  const joinYear = new Date(joinedAt).getFullYear();

  // Member had not joined yet
  if (joinYear > targetYear) return 0;

  // Any year from join year onward (past, current, or future) = full fee
  return yearlyFee;
};

/**
 * Calculates cumulative dues from the member's join year through a target year.
 * Every year in the range counts as one full yearlyFee.
 * Works for past, current, and future target years.
 *
 * @param joinedAt   - Timestamp when the member joined
 * @param yearlyFee  - Yearly fee rate assigned to the member
 * @param targetYear - The year to calculate cumulative dues up to (inclusive)
 * @returns Total expected dues from join year through end of targetYear
 */
export const calculateCumulativeDues = (joinedAt: number, yearlyFee: number | undefined, targetYear: number): number => {
  if (!yearlyFee || yearlyFee <= 0) return 0;

  const joinYear = new Date(joinedAt).getFullYear();

  if (joinYear > targetYear) return 0;

  const years = Math.max(1, targetYear - joinYear + 1);
  return years * yearlyFee;
};
