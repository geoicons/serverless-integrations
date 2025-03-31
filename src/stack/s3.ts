import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";
import { append_prefix } from "./utilities";

export function createBuckets(scope: Construct, prefix: string, stage: string) {
    const bucketConfig = {
        removalPolicy: stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
    };

    // Backend Buckets
    const clientBucket = new s3.Bucket(scope, append_prefix("client", prefix), {
        ...bucketConfig,
        bucketName: append_prefix("client", prefix),
    });

    return {
        clientBucket,
    };
}
