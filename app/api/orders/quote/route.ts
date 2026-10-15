import { NextResponse } from "next/server";
import { quoteOrder } from "@/lib/orders";
import { orderErrorResponse } from "@/lib/order-response";
export async function POST(request: Request) {
  try { return NextResponse.json(await quoteOrder(await request.json()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return orderErrorResponse(error); }
}
