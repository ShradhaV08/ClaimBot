import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createClaimSchema } from "@/lib/schemas";
import { todayInIndia } from "@/lib/dates";
import { CURRENT_USER_ID } from "@/lib/currentUser";
import { evaluateClaimPolicy, getExpenseDateError } from "@/lib/claim-policy";

export const runtime = "nodejs";

const CLAIM_COLUMNS =
  "id, employee_id, category, amount, expense_date, description, has_receipt, status, policy_check, created_at";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected claims API error";
}

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from("claims")
      .select(CLAIM_COLUMNS)
      .eq("employee_id", CURRENT_USER_ID)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[claims:GET]", error.message);
      return NextResponse.json({ error: "Could not retrieve claims" }, { status: 500 });
    }

    return NextResponse.json({ claims: data });
  } catch (error) {
    console.error("[claims:GET]", errorMessage(error));
    return NextResponse.json({ error: "Could not retrieve claims" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid claim", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { category, amount, expense_date, description, has_receipt } = parsed.data;
  const dateError = getExpenseDateError(expense_date, todayInIndia());
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("grade")
      .eq("id", CURRENT_USER_ID)
      .single();

    if (employeeError) {
      console.error("[claims:POST] Employee lookup failed:", employeeError.message);
      return NextResponse.json({ error: "Could not load employee policy details" }, { status: 500 });
    }

    const { data: policy, error: policyError } = await supabase
      .from("policy_rules")
      .select("max_amount, receipt_required_above")
      .eq("category", category)
      .eq("grade", employee.grade)
      .single();

    if (policyError) {
      console.error("[claims:POST] Policy lookup failed:", policyError.message);
      return NextResponse.json({ error: "Could not load the applicable claim policy" }, { status: 500 });
    }

    const policyResult = evaluateClaimPolicy({
      amount,
      category,
      grade: employee.grade,
      has_receipt,
      policy,
    });
    if ("error" in policyResult) {
      return NextResponse.json(
        { error: policyResult.error },
        { status: 400 }
      );
    }

    const { data: claim, error: insertError } = await supabase
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
      .select(CLAIM_COLUMNS)
      .single();

    if (insertError) {
      console.error("[claims:POST] Claim insert failed:", insertError.message);
      return NextResponse.json({ error: "Could not submit claim" }, { status: 500 });
    }

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    console.error("[claims:POST]", errorMessage(error));
    return NextResponse.json({ error: "Could not submit claim" }, { status: 500 });
  }
}
