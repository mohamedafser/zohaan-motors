import { z } from "zod";
import { emailSchema, validationMessages } from "@/lib/validation/index";

export const inviteUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().min(1, { error: validationMessages.required }),
  lastName: z.string().trim().min(1, { error: validationMessages.required }),
  roleKey: z.string().min(1, { error: validationMessages.required }),
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  firstName: z.string().trim().min(1, { error: validationMessages.required }).optional(),
  lastName: z.string().trim().min(1, { error: validationMessages.required }).optional(),
});

export const editUserFormSchema = inviteUserSchema.omit({ roleKey: true });

export type InviteUserValues = z.infer<typeof inviteUserSchema>;
export type UpdateUserValues = z.infer<typeof updateUserSchema>;
