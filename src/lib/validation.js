// lib/validation.js
import { z } from 'zod'

export const artworkSchema = z.object({
  title: z.string().min(1),
  medium: z.string().optional(),
  subject_matter: z.string().optional(),
  tags: z.array(z.string()).optional(),
  year: z.union([
    z.number().int().min(1000).max(new Date().getFullYear()),
    z.string().regex(/^(\d{4})\s*-\s*(\d{4})$/), // "2020‑2022"
    z.string().regex(/^c\.\s*\d{4}$/i),         // "c. 1900"
  ]),
  inventory_number: z.string().optional(),
  description: z.string().optional(),
  private_note: z.string().optional(),
  dimensions: z.object({
    height: z.number().optional(),
    width: z.number().optional(),
    depth: z.number().optional(),
    framed_height: z.number().optional(),
    framed_width: z.number().optional(),
    framed_depth: z.number().optional(),
  }),
  framed: z.boolean(),
  frame_details: z.string().optional(),
  weight: z.number().optional(),
  signed: z.boolean(),
  signed_where: z.string().optional(),
  location: z.boolean(),
  exhibition_history: z.array(z.string()).optional(),
  image_url: z.string().url(),
})
