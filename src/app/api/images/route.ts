// import { NextResponse } from "next/server";
// import pool from "@/lib/db.neon";
// import { images } from "@/data/images";
// import fs from "fs";
// import path from "path";
// import sizeOf from "image-size";

// export async function GET() {
//   const connection = await pool.connect();

//   try {
//     const productResult = await connection.query<{
//       image: string | null;
//       created_at: string;
//       updated_at: string;
//     }>(`
//       SELECT 
//         image, 
//         created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
//         updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at
//       FROM products
//       WHERE image IS NOT NULL
//     `);

//     const categoryResult = await connection.query<{
//       image: string | null;
//       created_at: string;
//       updated_at: string;
//     }>(`
//       SELECT 
//         image, 
//         created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
//         updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at
//       FROM categories
//       WHERE image IS NOT NULL
//     `);

//     const allImages = [...productResult.rows, ...categoryResult.rows];

//     const usageCount: Record<string, number> = {};
//     const usageTimestamps: Record<
//       string,
//       { created_at: string[]; updated_at: string[] }
//     > = {};

//     allImages.forEach(({ image, created_at, updated_at }) => {
//       if (!image) return;
//       usageCount[image] = (usageCount[image] || 0) + 1;

//       if (!usageTimestamps[image]) {
//         usageTimestamps[image] = { created_at: [], updated_at: [] };
//       }
//       usageTimestamps[image].created_at.push(created_at);
//       usageTimestamps[image].updated_at.push(updated_at);
//     });

//     const results = images.map((imgPath) => {
//       const pathSegments = imgPath.split("/").slice(1); // remove leading slash
//       const filePath = path.join(process.cwd(), "public", ...pathSegments);

//       let size = 0;
//       let width = 0;
//       let height = 0;

//       try {
//         const stats = fs.statSync(filePath);
//         size = stats.size;

//         const dim = sizeOf(fs.readFileSync(filePath));
//         width = dim.width || 0;
//         height = dim.height || 0;
//       } catch (err) {
//         console.warn("Missing or unreadable file:", filePath);
//       }

//       return {
//         name: imgPath.split("/").pop() || "Unnamed",
//         path: imgPath,
//         size,
//         width,
//         height,
//         used: usageCount[imgPath] > 0,
//         usageCount: usageCount[imgPath] || 0,
//         usedIn: usageTimestamps[imgPath]?.created_at.length
//           ? {
//               createdAtSamples: usageTimestamps[imgPath].created_at.slice(0, 3),
//               updatedAtSamples: usageTimestamps[imgPath].updated_at.slice(0, 3),
//             }
//           : undefined,
//       };
//     });

//     return NextResponse.json(results);
//   } catch (err) {
//     console.error("Failed to read image data:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   } finally {
//     connection.release();
//   }
// }
