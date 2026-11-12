import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";
import { CURRENT_USER_ID } from "../currentUser";
import { todayInIndia } from "../dates";
import { createClaimSchema } from "../schemas";
import { evaluateClaimPolicy, getExpenseDateError } from "../claim-policy";

const getEmployee = defineTool({
  name: "getEmployee",
  description: "Use this when the user asks about their employee profile.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("employees")
      .select("id, name, email, grade, department, manager_name, base_city")
      .eq("id", CURRENT_USER_ID)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`No employee found with id ${CURRENT_USER_ID}`);
    return data;
  },
});

const listClaims = defineTool({
  name: "listClaims",
  description:
    "Use this when the user wants to see their expense claims. Can filter by status. Returns at most 20 claims, newest first.",
  schema: z.object({
    status: z
      .enum(["submitted", "flagged", "approved", "rejected", "paid"])
      .optional()
      .describe("Which claim status to return. Omit to include all statuses."),
  }),
  run: async ({ status }) => {
    let query = getSupabase()
      .from("claims")
      .select(
        "id, category, amount, expense_date, description, has_receipt, status, policy_check, created_at"
      )
      .eq("employee_id", CURRENT_USER_ID)
      .order("created_at", { ascending: false })
      .limit(20);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data.length, claims: data };
  },
});

const getPolicyRules = defineTool({
  name: "getPolicyRules",
  description: "Use this when the user asks about expense policies for their employee grade.",
  schema: z.object({}),
  run: async () => {
    const { data: employee, error: employeeError } = await getSupabase()
      .from("employees")
      .select("grade")
      .eq("id", CURRENT_USER_ID)
      .maybeSingle();
    if (employeeError) throw new Error(employeeError.message);
    if (!employee) throw new Error(`No employee found with id ${CURRENT_USER_ID}`);

    const { data: policyRules, error: policyRulesError } = await getSupabase()
      .from("policy_rules")
      .select("category, grade, max_amount, receipt_required_above, notes")
      .eq("grade", employee.grade)
      .order("category", { ascending: true });
    if (policyRulesError) throw new Error(policyRulesError.message);
    return { grade: employee.grade, policyRules };
  },
});

const submitClaim = defineTool({
  name: "submitClaim",
  description:
    "Submit an expense claim only after the user explicitly confirms a summary of the exact claim.",
  writes: true,
  schema: createClaimSchema,
  run: async ({ category, amount, expense_date, description, has_receipt }) => {
    const dateError = getExpenseDateError(expense_date, todayInIndia());
    if (dateError) throw new Error(dateError);

    const { data: employee, error: employeeError } = await getSupabase()
      .from("employees")
      .select("grade")
      .eq("id", CURRENT_USER_ID)
      .maybeSingle();
    if (employeeError) throw new Error(employeeError.message);
    if (!employee) throw new Error(`No employee found with id ${CURRENT_USER_ID}`);

    const { data: policy, error: policyError } = await getSupabase()
      .from("policy_rules")
      .select("max_amount, receipt_required_above")
      .eq("grade", employee.grade)
      .eq("category", category)
      .maybeSingle();
    if (policyError) throw new Error(policyError.message);
    if (!policy) {
      throw new Error(`No policy found for category ${category} and grade ${employee.grade}`);
    }

    const policyResult = evaluateClaimPolicy({
      amount,
      category,
      grade: employee.grade,
      has_receipt,
      policy,
    });
    if ("error" in policyResult) throw new Error(policyResult.error);

    const { data, error } = await getSupabase()
      .from("claims")
      .insert({
        employee_id: CURRENT_USER_ID,
        category,
        amount,
        expense_date,
        description,
        has_receipt,
        status: policyResult.status,
        policy_check: policyResult.policy_check,
      })
      .select(
        "id, employee_id, category, amount, expense_date, description, has_receipt, status, policy_check, created_at"
      )
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
});

export const tools: AgentTool[] = [getEmployee, listClaims, getPolicyRules, submitClaim];
