import { SNSEvent } from "aws-lambda";
import * as AWS from "aws-sdk";
import { processIntegration } from "./application/integration";
import { updateInvocationStatus, InvocationStatus } from "./utilities/integrationUtility";

// Initialize AWS clients
const s3Client = new AWS.S3({ region: process.env.RESOURCEREGION });
const snsClient = new AWS.SNS({ region: process.env.RESOURCEREGION });

export const handler = async (event: SNSEvent): Promise<void> => {
    try {
        console.log("Received SNS event:", JSON.stringify(event, null, 2));

        // Process each record in the SNS event
        for (const record of event.Records) {
            const message = JSON.parse(record.Sns.Message);
            console.log("Processing message:", JSON.stringify(message, null, 2));

            try {
                // Execute the integration code and get the result
                const result = await processIntegration(message);

                // Update status based on the integration result
                await updateInvocationStatus(message.invocationId, result.status, result.error);

                // If the integration failed or was partial, throw an error to trigger the SNS retry
                if (result.status !== InvocationStatus.COMPLETED) {
                    throw new Error(result.error || "Integration did not complete successfully");
                }
            } catch (error) {
                console.error("Error processing integration:", error);
                // Update status to FAILED on error
                await updateInvocationStatus(
                    message.invocationId,
                    InvocationStatus.FAILED,
                    error instanceof Error ? error.message : "Unknown error"
                );
                throw error;
            }
        }
    } catch (error) {
        console.error("Error processing SNS event:", error);
        throw error;
    }
};
