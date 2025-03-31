import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Duration } from "aws-cdk-lib";
import { append_prefix } from "./utilities";
import * as sns from "aws-cdk-lib/aws-sns";
import * as s3 from "aws-cdk-lib/aws-s3";

export function createLambdaSNS(
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
    let snsEnvironment = {};
    snsEnvironment = { ...sharedEnvironment, ...snsEnvironment };

    let backendLambdaConfig = {
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset("src/lambda_sns"),
        handler: "service.main",
        timeout: Duration.minutes(15),
        architecture: lambda.Architecture.ARM_64,
        memorySize: 512,
        environment: snsEnvironment,
        functionName: append_prefix("lambda_sns", prefix),
    };

    // Finally we create the handler based on that config
    const sns_lambda = new lambda.Function(scope, append_prefix("lambda_sns", prefix), backendLambdaConfig);

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
    sns_lambda.addToRolePolicy(dynamodb_policy_statement);

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
    sns_lambda.addToRolePolicy(s3_policy_statement);

    // Add SNS Publish Permission
    const sns_policy_statement = new iam.PolicyStatement({
        actions: ["sns:Publish"],
        resources: [integrationTopic.topicArn, scheduleTopic.topicArn],
    });
    sns_lambda.addToRolePolicy(sns_policy_statement);

    return {
        sns_lambda,
    };
}
