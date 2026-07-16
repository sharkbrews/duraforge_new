import { NextResponse } from "next/server";
import {
  getUserByEmail,
  getUsers,
  saveUsers,
} from "@/lib/store";
import {
  hashPassword,
  newUserId,
  setSessionCookie,
  toPublicUser,
} from "@/lib/auth";
import type { Address } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      companyName,
      phone,
      vatNumber,
      deliveryAddress,
    } = body as {
      email?: string;
      password?: string;
      companyName?: string;
      phone?: string;
      vatNumber?: string;
      deliveryAddress?: Address;
    };

    if (
      !email?.trim() ||
      !password ||
      password.length < 8 ||
      !companyName?.trim() ||
      !phone?.trim() ||
      !deliveryAddress?.line1 ||
      !deliveryAddress?.city ||
      !deliveryAddress?.postcode
    ) {
      return NextResponse.json(
        { error: "Please fill in all required fields. Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const normalisedEmail = email.trim().toLowerCase();
    if (await getUserByEmail(normalisedEmail)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const user = {
      id: newUserId(),
      email: normalisedEmail,
      passwordHash: hashPassword(password),
      companyName: companyName.trim(),
      vatNumber: vatNumber?.trim() || undefined,
      phone: phone.trim(),
      deliveryAddress: {
        line1: deliveryAddress.line1.trim(),
        line2: deliveryAddress.line2?.trim(),
        city: deliveryAddress.city.trim(),
        county: deliveryAddress.county?.trim(),
        postcode: deliveryAddress.postcode.trim().toUpperCase(),
      },
      createdAt: new Date().toISOString(),
    };

    const users = await getUsers();
    users.push(user);
    await saveUsers(users);
    await setSessionCookie(user.id);

    return NextResponse.json({ user: toPublicUser(user) });
  } catch {
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
