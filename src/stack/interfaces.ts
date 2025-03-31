import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";

export interface BackendAssets {
    api_lambda: lambda.Function;
    lambda_api: apigateway.LambdaRestApi;
}

export interface BucketAssets {
    clientBucket: s3.Bucket;
}

export interface TableAssets {
    invocationTable: dynamodb.Table;
    credentialsTable: dynamodb.Table;
}
