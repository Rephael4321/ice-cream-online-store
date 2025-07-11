import { createServer } from "http";
import { NextRequest } from "next/server";
import { Readable } from "stream";
import { POST as handleOrder } from "@/app/api/orders/route";

const handler = async (req: any, res: any) => {
  if (req.method === "POST" && req.url === "/api/orders") {
    const body = await new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk: any) => (data += chunk));
      req.on("end", () => resolve(JSON.parse(data)));
    });

    const stream = Readable.from([JSON.stringify(body)]);
    const nextReq = new NextRequest(`http://localhost/api/orders`, {
      method: "POST",
      body: stream as any,
      headers: new Headers(req.headers),
    });

    const response = await handleOrder(nextReq);
    const json = await response.json();

    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(JSON.stringify(json));
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
};

const app = createServer(handler);
export default app;
