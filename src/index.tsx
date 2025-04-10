import { serve } from "bun";
import index from "./index.html";
import { renderToReadableStream } from "react-dom/server";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/hero": {
      async GET(req) {
        const {default : Hero} = await import("../src/pages/hero")
        const stream = await renderToReadableStream(<Hero/>)
        return new Response (stream,{
          headers: {
            "Content-Type": "text/html",
          },
        })
      }
    },
    
  },

  development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url}`);
