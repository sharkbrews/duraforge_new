import { NextResponse } from "next/server";
import { createEnquiry } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, companyName, email, phone, message } = body as {
      name?: string;
      companyName?: string;
      email?: string;
      phone?: string;
      message?: string;
    };

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 },
      );
    }

    const enquiry = await createEnquiry({
      name,
      companyName,
      email,
      phone,
      message,
    });

    return NextResponse.json({ enquiry });
  } catch {
    return NextResponse.json({ error: "Could not send enquiry." }, { status: 500 });
  }
}
