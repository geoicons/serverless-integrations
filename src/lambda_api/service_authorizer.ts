import { APIGatewayTokenAuthorizerHandler, APIGatewayAuthorizerResult } from "aws-lambda";

export const authorizer: APIGatewayTokenAuthorizerHandler = async (event) => {
    console.log(event);
    const token = event.authorizationToken;

    if (token === process.env.BACKENDAPIKEY) {
        // Allow the request to proceed with an anonymous identity
        let policy = generatePolicy(token, "Allow", event.methodArn);
        console.log(policy);
        return policy;
    } else {
        // Deny the request because the token is not a JWT or a GUID
        let policy = generatePolicy(token, "Deny", event.methodArn);
        console.log(policy);
        return policy;
    }
};

function generatePolicy(principalId: string, effect: "Allow" | "Deny", resource: string): APIGatewayAuthorizerResult {
    const policyDocument = {
        Version: "2012-10-17",
        Statement: [
            {
                Action: "execute-api:Invoke",
                Effect: effect,
                Resource: resource,
            },
        ],
    };

    return {
        principalId,
        policyDocument,
    };
}
