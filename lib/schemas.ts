import { z } from "zod";

/** Shared request and claim validation schemas. */

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .describe("Date in YYYY-MM-DD format");

export const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(4000),
});

export const agentRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(30),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

const claimCategories = [
  "local_travel",
  "outstation_travel",
  "hotel_metro",
  "hotel_non_metro",
  "meals",
  "client_entertainment",
  "internet",
  "mobile",
  "training",
] as const;

export const createClaimSchema = z.object({
  category: z.enum(claimCategories).describe("Expense category"),
  amount: z.number().positive().describe("Claim amount in rupees"),
  expense_date: isoDate.refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Use a valid YYYY-MM-DD date").describe("Date the expense was incurred"),
  description: z.string().trim().min(1).describe("Description of the expense"),
  has_receipt: z.boolean().describe("Whether a receipt is available"),
});
