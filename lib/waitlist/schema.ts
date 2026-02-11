import { z } from 'zod';

export const WaitlistRoles = [
  'student',
  'business owner',
  'salary earner',
  'cryto trader',
  'job seeker',
  'founder',
  'developer',
  'Influencer',
] as const;

export const WaitlistSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your name.').max(120, 'Name is too long.'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email.').max(255, 'Email is too long.'),
  role: z
    .string()
    .trim()
    .min(1, 'Please select a role.')
    .refine((v) => (WaitlistRoles as readonly string[]).includes(v), 'Please select a role.'),
  pricePerScanUsd: z
    .string()
    .trim()
    .max(20, 'Amount is too long.')
    .min(1, 'Please enter a price.')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter a valid amount.')
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1000, 'Amount seems too high.'),
});

export type WaitlistInput = z.infer<typeof WaitlistSchema>;
