import { z } from "zod";

import { isValidE164 } from "@/lib/utils/phone";
import { validationMessages } from "@/lib/validation/index";

const required = z.string().trim().min(1, { error: validationMessages.required });

const bookingAmounts = {
  /** Optional: a booking can be made before any deposit is received (0 = none yet). */
  deposit: z
    .number({ error: validationMessages.number })
    .finite({ error: validationMessages.number })
    .nonnegative({ error: validationMessages.currency })
    .default(0),
  /** Agreed price for the car; the server checks it against the minimum selling price. */
  sellingPrice: z
    .number({ error: validationMessages.required })
    .finite({ error: validationMessages.required })
    .nonnegative({ error: validationMessages.currency }),
};

export const createBookingSchema = z
  .object({
    vehicleId: z.string().uuid({ error: validationMessages.required }),
    customerMode: z.enum(["existing", "new"]),
    customerId: z.string().optional(),
    salespersonId: z.string().optional(),
    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    ...bookingAmounts,
    /** Units to book on a multi-unit record; omitted means all of them. */
    quantity: z
      .number({ error: validationMessages.number })
      .int({ error: validationMessages.number })
      .min(1, { error: validationMessages.number })
      .optional(),
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


export const editBookingSchema = z.object({
  ...bookingAmounts,
  notes: z.string().trim().max(1000).optional(),
});

export const bookingActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), reason: z.string().trim().max(500).optional() }),
  /** Selling records the full balance as received; the server works it out. */
  z.object({ action: z.literal("sold") }),
  editBookingSchema.extend({ action: z.literal("edit") }),
]);

export type CreateBookingValues = z.infer<typeof createBookingSchema>;
export type BookingActionValues = z.infer<typeof bookingActionSchema>;
