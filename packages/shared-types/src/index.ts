import { z } from 'zod';

export const GarmentCategorySchema = z.enum([
  'tshirt',
  'shirt',
  'kurta',
  'dress_short',
  'hoodie'
]);
export type GarmentCategory = z.infer<typeof GarmentCategorySchema>;

export const ProductStatusSchema = z.enum([
  'pending',
  'processing',
  'approved',
  'needs_review',
  'unsupported',
  'disabled',
  'error'
]);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export const Point2DSchema = z.tuple([z.number(), z.number()]);
export type Point2D = z.infer<typeof Point2DSchema>;

export const GarmentKeypointsFrontSchema = z.object({
  neck_left: Point2DSchema,
  neck_right: Point2DSchema,
  neck_center_bottom: Point2DSchema,
  shoulder_left: Point2DSchema,
  shoulder_right: Point2DSchema,
  sleeve_left_end_top: Point2DSchema,
  sleeve_left_end_bottom: Point2DSchema,
  sleeve_right_end_top: Point2DSchema,
  sleeve_right_end_bottom: Point2DSchema,
  armpit_left: Point2DSchema,
  armpit_right: Point2DSchema,
  hem_left: Point2DSchema,
  hem_right: Point2DSchema,
  hem_center: Point2DSchema
});
export type GarmentKeypointsFront = z.infer<typeof GarmentKeypointsFrontSchema>;

export const GarmentAssetSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  status: ProductStatusSchema,
  category: GarmentCategorySchema,
  images: z.object({
    front: z.object({
      url: z.string().url(),
      width: z.number().positive(),
      height: z.number().positive()
    }),
    back: z.object({
      url: z.string().url()
    }).nullable().optional(),
    side: z.object({
      url: z.string().url()
    }).nullable().optional()
  }),
  keypoints: z.object({
    front: GarmentKeypointsFrontSchema,
    back: GarmentKeypointsFrontSchema.partial().nullable().optional()
  }),
  physical: z.object({
    lengthToWidthRatio: z.number().positive(),
    sleeveType: z.enum(['short', 'long', 'sleeveless'])
  }),
  shading: z.object({
    meanLuminance: z.number().min(0).max(1)
  }),
  version: z.number().int().positive()
});
export type GarmentAsset = z.infer<typeof GarmentAssetSchema>;
