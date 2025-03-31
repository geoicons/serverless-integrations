import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Duration } from "aws-cdk-lib";
import { append_prefix } from "./utilities";
import * as sns from "aws-cdk-lib/aws-sns";
import * as s3 from "aws-cdk-lib/aws-s3";
export function createLambdaApi(
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
    let apiEnvironment = {};
    apiEnvironment = { ...sharedEnvironment, ...apiEnvironment };

    let backendLambdaConfig = {
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset("src/lambda_api"),
        handler: "service.main",
        timeout: Duration.seconds(60),
        architecture: lambda.Architecture.ARM_64,
        memorySize: 512,
        environment: apiEnvironment,
        functionName: append_prefix("lambda_api", prefix),
    };

    // Finally we create the handler based on that config
    const api_lambda = new lambda.Function(scope, append_prefix("lambda_api", prefix), backendLambdaConfig);

    // Create custom authorizor that only allows the api_lambda to run when the user is authenticated
    let authorizorConfig = {
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset("src/lambda_api"),
        handler: "service_authorizer.authorizer",
        timeout: Duration.seconds(60),
        architecture: lambda.Architecture.ARM_64,
        memorySize: 512,
        environment: apiEnvironment,
        functionName: append_prefix("authorizor", prefix),
    };

    // Create the authorizer lambda
    const authorizorLambda = new lambda.Function(scope, append_prefix("lambdaApiAuthorizer", prefix), authorizorConfig);
    const authorizor = new apigateway.TokenAuthorizer(scope, append_prefix("lambdaTokenAuthorizer", prefix), {
        handler: authorizorLambda,
        identitySource: "method.request.header.Authorization",
        resultsCacheTtl: Duration.seconds(0),
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
    api_lambda.addToRolePolicy(dynamodb_policy_statement);

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
    api_lambda.addToRolePolicy(s3_policy_statement);

    // Add SNS Publish Permission
    const sns_policy_statement = new iam.PolicyStatement({
        actions: ["sns:Publish"],
        resources: [integrationTopic.topicArn, scheduleTopic.topicArn],
    });
    api_lambda.addToRolePolicy(sns_policy_statement);

    // Create the API gateway and link its handler
    const lambda_api = new apigateway.LambdaRestApi(scope, append_prefix("lambda-api", prefix), {
        handler: api_lambda,
        proxy: false,
        // ensure the api is deployed without any methods
        deployOptions: { stageName: sharedEnvironment.STAGE },
        binaryMediaTypes: ["*/*"],
        defaultCorsPreflightOptions: {
            allowHeaders: ["Authorization"],
            allowOrigins: apigateway.Cors.ALL_ORIGINS,
            allowMethods: apigateway.Cors.ALL_METHODS,
        },
        restApiName: append_prefix("lambda-api", prefix),
    });

    // Add the authorizor to the lambda_api while maintaining the proxy behaviour
    lambda_api.root.addProxy({
        defaultIntegration: new apigateway.LambdaIntegration(api_lambda),
        anyMethod: true,
        defaultMethodOptions: {
            authorizationType: apigateway.AuthorizationType.CUSTOM,
            authorizer: authorizor,
            // require every request is authorized and the authorization header to be present
            requestParameters: {
                "method.request.header.Authorization": true,
            },
        },
    });

    return {
        api_lambda,
        lambda_api,
    };
}
