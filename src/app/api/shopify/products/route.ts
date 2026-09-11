import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

export async function GET(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);
    if (!isOwner && !user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    // 1. Get company settings for shopify store domain
    const settings = await prisma.companySettings.findFirst();
    const domain = settings?.shopifyStoreDomain || "esponsports.com";

    // 2. Fetch products from database
    let products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" }
    });

    // 3. Pre-fill mock products if empty so it never shows empty
    if (products.length === 0) {
      const mockProducts = [
        {
          name: "Espon Sports Premium Jersey",
          sku: "ESP-JER-01",
          sellingPrice: 999,
          mrp: 1499,
          purchasePrice: 400,
          stockQuantity: 150,
          category: "Jerseys",
          subCategory: "espon-sports-premium-jersey",
          description: "High-quality breathable activewear jersey for athletic performance and ultimate comfort.",
          images: ["https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=500&auto=format&fit=crop&q=60"],
          status: "Active"
        },
        {
          name: "Espon Compression Tights",
          sku: "ESP-CPT-02",
          sellingPrice: 1299,
          mrp: 1999,
          purchasePrice: 500,
          stockQuantity: 80,
          category: "Compression Wear",
          subCategory: "espon-compression-tights",
          description: "Advanced muscle-support compression tights with moisture-wicking technology.",
          images: ["https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&auto=format&fit=crop&q=60"],
          status: "Active"
        },
        {
          name: "Espon Training Shorts",
          sku: "ESP-TRS-03",
          sellingPrice: 799,
          mrp: 1199,
          purchasePrice: 300,
          stockQuantity: 200,
          category: "Shorts",
          subCategory: "espon-training-shorts",
          description: "Lightweight training shorts with secure zipper pockets and dynamic stretch fabric.",
          images: ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=60"],
          status: "Active"
        },
        {
          name: "Espon Sports Water Bottle",
          sku: "ESP-BOT-04",
          sellingPrice: 499,
          mrp: 799,
          purchasePrice: 150,
          stockQuantity: 300,
          category: "Accessories",
          subCategory: "espon-sports-water-bottle",
          description: "BPA-free vacuum insulated stainless steel water bottle, keeps drinks ice cold for 24 hours.",
          images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=60"],
          status: "Active"
        }
      ];

      for (const p of mockProducts) {
        await prisma.product.create({ data: p });
      }

      products = await prisma.product.findMany({
        orderBy: { createdAt: "desc" }
      });
    }

    // 4. Map DB products to Shopify Product shape expected by frontend panel
    const formattedProducts = products.map((p) => ({
      id: p.id,
      title: p.name,
      handle: p.subCategory || p.sku || p.id,
      body_html: p.description || "",
      product_type: p.category || "General",
      variants: [
        {
          price: String(p.sellingPrice || 0)
        }
      ],
      images: p.images && p.images.length > 0
        ? p.images.map((img) => ({ src: img }))
        : [{ src: "https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=500&auto=format&fit=crop&q=60" }]
    }));

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      domain: domain
    });
  } catch (error: any) {
    console.error("Shopify products API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      products: []
    });
  }
}
