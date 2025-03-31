"use strict";
// Import the common type utility - simiplifying and standardising type definitions
import { expressResponseType } from "../utilities/interfaces";
import * as AWS from "aws-sdk";
import { ddb } from "../utilities/dynamoClass";

// Initialize AWS clients
const snsClient = new AWS.SNS({ region: process.env.RESOURCEREGION });

// This method is used to Get
export async function get(request: any) {
    console.log("inside get");

    let response: expressResponseType = {
        status: 200,
        message: "success",
        data: "success",
    };

    return response;
}

// This method is used to Post
export async function post(request: any) {
    console.log("inside post");
    console.log("Request body:", JSON.stringify(request.body, null, 2));

    try {
        // Check for active invocations in DynamoDB
        const invocationDb = new ddb(process.env.INVOCATION_TABLE_NAME || "");
        const activeInvocations = await invocationDb.query(
            `SELECT * FROM "${process.env.INVOCATION_TABLE_NAME}" WHERE status = 'PROCESSING'`
        );

        if (activeInvocations && activeInvocations.length > 0) {
            console.log("Found active invocations, skipping integration trigger");
            return {
                status: 409,
                message: "An integration is currently being processed",
                data: "Please wait for the current integration to complete before starting a new one",
            };
        }

        // No active invocations found, trigger the integration
        console.log("No active invocations found, triggering integration");
        const invocationId = `api_${new Date().toISOString()}`;

        // Create the invocation record first
        await invocationDb.put(
            {
                id: invocationId,
                source: "api",
                timestamp: new Date().toISOString(),
                status: "PROCESSING",
                ...request.body,
            },
            invocationId
        );

        // Trigger the integration via SNS
        await snsClient
            .publish({
                TopicArn: process.env.INTEGRATION_TOPIC_ARN,
                Message: JSON.stringify({
                    type: "PROCESS_INVOCATION",
                    data: {
                        id: invocationId,
                        source: "api",
                        timestamp: new Date().toISOString(),
                        status: "PROCESSING",
                        ...request.body,
                    },
                }),
            })
            .promise();

        console.log("Integration trigger sent successfully");
        return {
            status: 202,
            message: "Integration triggered successfully",
            data: {
                invocationId,
                status: "PROCESSING",
            },
        };
    } catch (error: any) {
        console.error("Error processing invocation request:", error);
        return {
            status: 500,
            message: "Error processing invocation request",
            data: error.message || "Unknown error occurred",
        };
    }
}

// This method is used to Put
export async function put(request: any) {
    console.log("inside put");

    let response: expressResponseType = {
        status: 200,
        message: "success",
        data: "success",
    };

    return response;
}

// This method is used to delete
export async function del(request: any) {
    console.log("inside delete");

    let response: expressResponseType = {
        status: 200,
        message: "success",
        data: "success",
    };

    return response;
}
