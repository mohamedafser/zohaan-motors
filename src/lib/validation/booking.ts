import { z } from "zod";

import { isValidE164 } from "@/lib/utils/phone";
import { validationMessages } from "@/lib/validation/index";

const required = z.string().trim().min(1, { error: validationMessages.required });

export const createBookingSchema = z
  .object({
    vehicleId: z.string().uuid({ error: validationMessages.required }),
    customerMode: z.enum(["existing", "new"]),
    customerId: z.string().optional(),
    salespersonId: z.string().optional(),
    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    deposit: z
      .number({ error: validationMessages.number })
      .finite({ error: validationMessages.number })
      .nonnegative({ error: validationMessages.currency }),
    expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: validationMessages.date }),
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.customerMode === "existing") {
      if (!value.customerId || !z.string().uuid().safeParse(value.customerId).success) {
        ctx.addIssue({ code: "custom", path: ["customerId"], message: validationMessages.required });
      }
      return;
    }
    for (const key of ["firstName", "lastName"] as const) {
      if (!required.safeParse(value[key] ?? "").success) {
        ctx.addIssue({ code: "custom", path: [key], message: validationMessages.required });
      }
    }
    if (!value.phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: validationMessages.required });
    } else if (!isValidE164(value.phone)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "validation.phoneInternational" });
    }
  });

export const bookingActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), reason: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("sold") }),
]);

export type CreateBookingValues = z.infer<typeof createBookingSchema>;
