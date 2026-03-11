export const PRICING = {
  AL: {
    studentPays: 1900,
    coachEarns: 1000,
    platformFee: 900
  },
  OL: {
    studentPays: 1200,
    coachEarns: 700,
    platformFee: 500
  }
}

export function getPricing(examType: string | null | undefined) {
  // Normalize examType to 'OL' or 'AL'
  const type = examType?.toUpperCase() === 'O/L' || examType?.toUpperCase() === 'OL' ? 'OL' : 'AL';
  return PRICING[type];
}

