import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from "aws-cdk-lib";
import { TableAssets } from "./interfaces";
import { append_prefix } from "./utilities";

export function createTables(
    scope: Construct,
    prefix: string,
    stage: string,
    primaryKeyName: string,
    sortKeyName: string
): TableAssets {
    const tableConfig = {
        partitionKey: { name: primaryKeyName, type: dynamodb.AttributeType.STRING },
        sortKey: { name: sortKeyName, type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        timeToLiveAttribute: "TTL",
        removalPolicy: stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    };

    // Backend Tables
    const invocationTable = new dynamodb.Table(scope, append_prefix("Invocation", prefix), {
        ...tableConfig,
        tableName: append_prefix("Invocation", prefix),
    });

    const credentialsTable = new dynamodb.Table(scope, append_prefix("Credentials", prefix), {
        ...tableConfig,
        tableName: append_prefix("Credentials", prefix),
    });

    return {
        invocationTable,
        credentialsTable,
    };
}
