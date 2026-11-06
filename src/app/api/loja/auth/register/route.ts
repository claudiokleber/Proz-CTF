import { NextRequest, NextResponse } from "next/server";
import { shopDb } from "@/lib/db-shop";
import { signShopJwt } from "@/lib/shop-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password || password.length < 4) {
      return NextResponse.json(
        { error: "Preencha nome, e-mail e uma senha de ao menos 4 caracteres." },
        { status: 400 }
      );
    }

    const existing = await shopDb.shopUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "E-mail já cadastrado na Proz Store." },
        { status: 409 }
      );
    }

    const user = await shopDb.shopUser.create({
      data: {
        name,
        email,
        password,
        role: "cliente",
      },
    });

    const token = signShopJwt({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set("proz_shop_token", token, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error("Erro no cadastro da loja:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar conta." },
      { status: 500 }
    );
  }
}
