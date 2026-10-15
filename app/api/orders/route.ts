import { NextResponse } from "next/server";
import { createValidatedOrder } from "@/lib/orders";
import { orderErrorResponse } from "@/lib/order-response";
export async function POST(request: Request) {
  try {
    const input = await request.json();
    if (!input || typeof input.requestId !== "string" || typeof input.quoteToken !== "string") throw new Error("INVALID_ORDER");
    return NextResponse.json(await createValidatedOrder(input, input.requestId, input.quoteToken));
  } catch (error) { return orderErrorResponse(error); }
}
