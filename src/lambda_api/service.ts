// Setup the express service
import { app } from "./application";
import serverless from "serverless-http";

// Define the binary MIME types (this is required so assets render correctly in the browser)
const binaryMimeTypes = [
    "application/javascript",
    "application/json",
    "application/octet-stream",
    "application/pdf",
    "application/xml",
    "application/font-woff",
    "font/eot",
    "font/opentype",
    "font/otf",
    "font/woff",
    "font/woff2",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "text/comma-separated-values",
    "text/css",
    "text/html",
    "text/javascript",
    "text/plain",
    "text/text",
    "text/xml",
];

// Create an instance of the API Gateway event handler
const handler = serverless(app, {
    binary: binaryMimeTypes,
});

// Lambda function handler
export const main = async (event: any, context: any) => {
    // Call the Serverless Express event handler
    const result = await handler(event, context);

    // Return the result
    return result;
};
