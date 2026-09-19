import { NextRequest, NextResponse } from "next/server";
import { lookupPincode } from "@/lib/pincodeLookup";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    const params = await context.params;
    const code = params?.code || "";
    const result = await lookupPincode(code);

    if (!result.valid) {
      return NextResponse.json({ success: false, ...result }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to lookup pincode" },
      { status: 500 }
    );
  }
}
