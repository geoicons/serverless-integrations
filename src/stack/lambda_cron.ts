import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Duration } from "aws-cdk-lib";
import { append_prefix } from "./utilities";
import * as sns from "aws-cdk-lib/aws-sns";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";

export function createLambdaCron(
    scope: Construct,
    prefix: string,
    sharedEnvironment: any,
    invocationTable: dynamodb.Table,
    credentialsTable: dynamodb.Table,
    clientBucket: s3.Bucket,
    integrationTopic: sns.Topic,
    scheduleTopic: sns.Topic
) {
    // Add Backend Parameters to sharedEnvironment
    let cronEnvironment = {};
    cronEnvironment = { ...sharedEnvironment, ...cronEnvironment };

    let backendLambdaConfig = {
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset("src/lambda_cron"),
        handler: "service.main",
        timeout: Duration.seconds(60),
        architecture: lambda.Architecture.ARM_64,
        memorySize: 512,
        environment: cronEnvironment,
        functionName: append_prefix("lambda_cron", prefix),
    };

    // Create the cron lambda
    const cron_lambda = new lambda.Function(scope, append_prefix("lambda_cron", prefix), backendLambdaConfig);

    // Create EventBridge rule for daily schedule (10am UTC)
    const rule = new events.Rule(scope, append_prefix("DailyScheduleRule", prefix), {
        schedule: events.Schedule.cron({ minute: "0", hour: "10" }),
        targets: [new targets.SnsTopic(scheduleTopic)],
    });

    // Backend Lambda requires PartiQL Read Write Access
    const dynamodb_policy_statement = new iam.PolicyStatement({
        actions: [
            "dynamodb:PartiQLSelect",
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
        ],
        resources: [invocationTable.tableArn, credentialsTable.tableArn],
    });
    cron_lambda.addToRolePolicy(dynamodb_policy_statement);

    // Add S3 Read Write Access
    const s3_policy_statement = new iam.PolicyStatement({
        actions: [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:ListBucket",
            "s3:PutObjectAcl",
            "s3:GetObjectAcl",
            "s3:DeleteObjectAcl",
        ],
        resources: [clientBucket.bucketArn],
    });
    cron_lambda.addToRolePolicy(s3_policy_statement);

    // Add SNS Publish Permission for both topics
    const sns_policy_statement = new iam.PolicyStatement({
        actions: ["sns:Publish"],
        resources: [integrationTopic.topicArn, scheduleTopic.topicArn],
    });
    cron_lambda.addToRolePolicy(sns_policy_statement);

    return {
        cron_lambda,
    };
}
