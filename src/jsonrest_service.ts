import { CfnOutput, Duration, RemovalPolicy, Stack, SecretValue } from "aws-cdk-lib";
import { Construct } from "constructs";
import { append_prefix, generate_composite_string } from "./stack/utilities";
import { createTables } from "./stack/dynamoDB";
import { createBuckets } from "./stack/s3";
import { createTopic } from "./stack/sns";
import { createLambdaApi } from "./stack/lambda_api";
import { createLambdaCron } from "./stack/lambda_cron";
import { createLambdaSNS } from "./stack/lambda_sns";
export class JSONService extends Construct {
    constructor(scope: Construct, stack_name: string, stage: string, region: string) {
        super(scope, stack_name);

        console.log("stack_name from app.ts", stack_name);
        console.log("stage from app.ts", stage);

        // =====================================================================================
        // Global Parameters
        // =====================================================================================
        // Prefix for all resources - prevents collisions in the same account / regions
        const prefix = `${stack_name}-${region}-${stage}`;

        // =====================================================================================
        // Create SNS Topics that is used to trigger the lambda_sns
        // =====================================================================================
        const { integrationTopic, scheduleTopic } = createTopic(this, prefix, stage);

        // =====================================================================================
        // Create S3 buckets that get destroyed when we pull the stack down
        // =====================================================================================
        const { clientBucket } = createBuckets(this, prefix, stage);

        // =====================================================================================
        // Create dynamoDB Tables
        // =====================================================================================
        let primaryKeyName = "pKey";
        let sortKeyName = "sKey";

        const { invocationTable, credentialsTable } = createTables(this, prefix, stage, primaryKeyName, sortKeyName);

        // =====================================================================================
        // Set shared environment variables for all Lambdas
        // =====================================================================================
        let sharedEnvironment: any = {
            RESOURCEREGION: region,
            STAGE: stage,
            TABLEPRIMARYKEY: primaryKeyName,
            TABLESORTKEY: sortKeyName,
            INVOCATION_TABLE_NAME: invocationTable.tableName,
            CREDENTIALS_TABLE_NAME: credentialsTable.tableName,
            INTEGRATION_TOPIC_ARN: integrationTopic.topicArn,
            SCHEDULE_TOPIC_ARN: scheduleTopic.topicArn,
            CLIENTBUCKET: clientBucket.bucketName,
        };

        // =====================================================================================
        // Create a Lambda Function that serves the LAMBDA_API
        // ====================================================================================
        const { api_lambda, lambda_api } = createLambdaApi(
            this,
            prefix,
            sharedEnvironment,
            invocationTable,
            credentialsTable,
            clientBucket,
            integrationTopic,
            scheduleTopic
        );

        // =====================================================================================
        // Create a Lambda Function that serves the LAMBDA_CRON
        // ====================================================================================
        const { cron_lambda } = createLambdaCron(
            this,
            prefix,
            sharedEnvironment,
            invocationTable,
            credentialsTable,
            clientBucket,
            integrationTopic,
            scheduleTopic
        );

        // =====================================================================================
        // Create a Lambda Function that serves the LAMBDA_SNS
        // ====================================================================================
        const { sns_lambda } = createLambdaSNS(
            this,
            prefix,
            sharedEnvironment,
            invocationTable,
            credentialsTable,
            clientBucket,
            integrationTopic,
            scheduleTopic
        );

        // Add an output to the stack
        let exportName: string;
        exportName = append_prefix("URL", prefix);
        const backEndUrl: string = `${lambda_api.url}`;
        const backEndUrlOutput = new CfnOutput(this, "APIURL", {
            exportName: exportName,
            value: backEndUrl,
        });
    }
}
