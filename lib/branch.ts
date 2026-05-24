/**
 * Helper utilities for student branches based on their VJIT college roll number.
 */

export type BranchCode = 'CSE' | 'CSE-AIML' | 'CSE-DS' | 'IT';

/**
 * Parses a student's roll number to determine their branch.
 * Example roll numbers:
 * - 24911A66J6 (A66 -> CSE-AIML)
 * - 24911A0501 (A05 -> CSE)
 * - 24911A6701 (A67 -> CSE-DS)
 * - 24911A1201 (A12 -> IT)
 */
export function getBranchFromRollNumber(rollNumber?: string): BranchCode {
  if (!rollNumber) return 'CSE-AIML'; // Fallback default
  
  const roll = rollNumber.trim().toUpperCase();
  
  if (roll.includes('A66')) return 'CSE-AIML';
  if (roll.includes('A05')) return 'CSE';
  if (roll.includes('A67')) return 'CSE-DS';
  if (roll.includes('A12')) return 'IT';
  
  // Extra fallbacks for common branch codes
  if (roll.includes('66')) return 'CSE-AIML';
  if (roll.includes('05')) return 'CSE';
  if (roll.includes('67')) return 'CSE-DS';
  if (roll.includes('12')) return 'IT';
  
  return 'CSE-AIML'; // Default fallback
}

/**
 * Returns the beautiful full display label for a branch.
 */
export function getBranchLabel(branch: string): string {
  switch (branch) {
    case 'CSE':
      return 'Computer Science Engineering';
    case 'CSE-AIML':
      return 'CSE — AI & Machine Learning';
    case 'CSE-DS':
      return 'CSE — Data Science';
    case 'IT':
      return 'Information Technology';
    default:
      return branch;
  }
}

/**
 * Returns the CSS gradient color tokens for a branch.
 */
export function getBranchColor(branch: string): string {
  switch (branch) {
    case 'CSE':
      return 'from-indigo-500 to-violet-600';
    case 'CSE-AIML':
      return 'from-emerald-500 to-teal-600';
    case 'CSE-DS':
      return 'from-orange-500 to-amber-600';
    case 'IT':
      return 'from-sky-500 to-blue-600';
    default:
      return 'from-zinc-500 to-zinc-700';
  }
}
