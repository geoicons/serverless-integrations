import express, { Request, Response, NextFunction, CookieOptions } from "express";
import cors from "cors";
import bodyParser from "body-parser";

export const app = express();

// Use body-parser to parse JSON bodies into JS objects
app.use(bodyParser.json());

// Middleware function for global logging of all requests.
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`Request received: ${req.method} ${req.url}`);
    next();
});

// CORS options
const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        callback(null, true);
    },
    credentials: true, // Required to allow sending cookies in cross-origin requests
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Length"], // Expose any headers you need client to access
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const codepath = "application";
app.all("/:endpoint", async (req: Request, res: Response, next: NextFunction) => {
    logRequests(req);

    try {
        console.log(`API request`);
        const module = await import(`./${codepath}/${req.params.endpoint}`);

        let response;
        switch (req.method) {
            case "GET":
                response = await module.get(req);
                break;
            case "POST":
                response = await module.post(req);
                break;
            case "PUT":
                response = await module.put(req);
                break;
            case "DELETE":
                response = await module.del(req);
                break;
            default:
                response = await module.get(req);
                break;
        }

        response = removeSomeHeaders(response, true);
        if (response.headers) res.set(response.headers);
        if (response.type) res.type(response.type);
        if (response.cache) res.set("Cache-Control", response.cache);
        res.status(response.status).send(response.data);
    } catch (error) {
        console.error("Error handling API request:", error);
        res.status(400).send(error);
    }
});

// Catch-all route to handle unsupported requests
app.all("/*", async (req: Request, res: Response, next: NextFunction) => {
    logRequests(req);
    console.log("Unsupported request");
    const response = "POST: method / endpoint not supported";
    res.status(404).send(response);
});

// Logging utility to track all requests.
function logRequests(request: Request): boolean {
    console.log("Parameters: ", request.params);
    console.log("Headers: ", request.headers);
    console.log("Body: ", request.body);
    console.log("Query: ", request.query);
    console.log("Path: ", request.path);
    console.log("URL: ", request.url);
    console.log("Method: ", request.method);

    return true;
}

// we dont want certain headers from the backend being sent to the requestor.
function removeSomeHeaders(response: any, all: boolean) {
    const headersToRemove = [
        "accept",
        "accept-language",
        "accept-encoding",

        "access-control-allow-origin",
        "cache-control",
        "host",

        "connection",

        "pragma",

        "sec-fetch-dest",
        "sec-fetch-mode",
        "sec-fetch-site",
        "sec-ch-ua",
        "sec-ch-ua-mobile",
        "sec-ch-ua-platform",

        "user-agent",
        "upgrade-insecure-requests",

        "x-forwarded-for",
        "x-forwarded-proto",
        "x-forwarded-port",

        "x-amzn-trace-id",
        "x-amzn-requestid",
        "x-amzn-remapped-content-length",
        "x-amz-apigw-id",
        "x-powered-by",
        "x-cache",
        "x-amz-cf-pop",
        "x-amz-cf-id",
    ];

    if (all) {
        delete response.headers;
    } else {
        headersToRemove.forEach((header) => {
            if (response.headers[header]) {
                delete response.headers[header];
            }
        });
    }

    return response;
}
