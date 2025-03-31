import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import { append_prefix } from "./utilities";

export function createTopic(scope: Construct, prefix: string, stage: string) {
    // Integration Trigger Topic
    const integrationTopic = new sns.Topic(scope, append_prefix("IntegrationTrigger", prefix), {
        topicName: append_prefix("IntegrationTrigger", prefix),
    });

    // Schedule Trigger Topic
    const scheduleTopic = new sns.Topic(scope, append_prefix("ScheduleTrigger", prefix), {
        topicName: append_prefix("ScheduleTrigger", prefix),
    });

    return { integrationTopic, scheduleTopic };
}
