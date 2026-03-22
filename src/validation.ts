import { z } from 'zod';

export const productIdSchema = z.uuid({
  error: 'Product id must be a valid UUID',
});

export const productPayloadSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  description: z.string().trim().min(1, 'description is required'),
  price: z.number({ error: 'price must be a number' }).positive('price must be a positive number'),
  category: z.string().trim().min(1, 'category is required'),
  inStock: z.boolean({ error: 'inStock must be a boolean' }),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(', ');
}
