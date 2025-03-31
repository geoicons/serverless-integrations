import { SNSEvent } from "aws-lambda";
import * as AWS from "aws-sdk";
import { ddb } from "./utilities/dynamoClass";

// Initialize AWS clients
const snsClient = new AWS.SNS({ region: process.env.RESOURCEREGION });

export const handler = async (event: SNSEvent): Promise<void> => {
    try {
        console.log("Received schedule trigger event:", JSON.stringify(event, null, 2));

        // Check for active invocations in DynamoDB
        const invocationDb = new ddb(process.env.INVOCATION_TABLE_NAME || "");
        const activeInvocations = await invocationDb.query(
            `SELECT * FROM "${process.env.INVOCATION_TABLE_NAME}" WHERE status = 'PROCESSING'`
        );

        if (activeInvocations && activeInvocations.length > 0) {
            console.log("Found active invocations, skipping integration trigger");
            return;
        }

        // No active invocations found, trigger the integration
        console.log("No active invocations found, triggering integration");
        await snsClient
            .publish({
                TopicArn: process.env.INTEGRATION_TOPIC_ARN,
                Message: JSON.stringify({
                    type: "PROCESS_INVOCATION",
                    data: {
                        id: `schedule_${new Date().toISOString()}`,
                        source: "schedule",
                        timestamp: new Date().toISOString(),
                        status: "PROCESSING",
                    },
                }),
            })
            .promise();

        console.log("Integration trigger sent successfully");
    } catch (error) {
        console.error("Error processing schedule trigger:", error);
        throw error;
    }
};
