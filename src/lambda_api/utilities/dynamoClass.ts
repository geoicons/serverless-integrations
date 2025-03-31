import * as AWS from "aws-sdk";
import {
    AttributeValue,
    BatchGetItemInput,
    ExecuteStatementInput,
    ExecuteStatementOutput,
    GetItemInput,
    PartiQLNextToken,
    PartiQLStatement,
    PutItemInput,
    PutItemInputAttributeMap,
} from "aws-sdk/clients/dynamodb";

export class ddb {
    region: string;
    table: string;
    primary: string;
    sort?: string;
    useSort: boolean;
    client: AWS.DynamoDB.DocumentClient;
    queryClient: AWS.DynamoDB;

    constructor(table: string, useSort: boolean = true) {
        if (!table) {
            throw "failed to create - missing table name";
        }
        this.useSort = useSort;
        this.region = process.env.RESOURCEREGION || "ap-southeast-2";
        this.table = table;
        this.primary = process.env.TABLEPRIMARYKEY || "pKey";
        if (useSort) {
            this.sort = process.env.TABLESORTKEY || "sKey";
        }
        this.client = new AWS.DynamoDB.DocumentClient({ region: process.env.RESOURCEREGION });
        this.queryClient = new AWS.DynamoDB({ region: process.env.RESOURCEREGION });
    }

    // create an async method that gets ALL record in a table
    async all() {
        let result: any = [];
        let options: BatchGetItemInput = {
            RequestItems: {
                [this.table]: {
                    Keys: [],
                },
            },
        };
        try {
            let data = await this.client.batchGet(options).promise();
            if (data.Responses && data.Responses[this.table]) {
                result = data.Responses[this.table];
            } else {
                console.log("No responses found in the data.");
            }
        } catch (error) {
            console.log("ERROR: getting DDB records: ", error);
            throw error;
        }
        return result;
    }

    async get(primary: any, sort?: any) {
        type resultType = { [key: string]: any };
        let result: resultType = {};

        let options: GetItemInput = {
            TableName: this.table,
            Key: {},
        };

        let method;
        if (this.useSort && this.sort != undefined && sort != undefined) {
            // the method has received a sort key and we want an exact match
            method = "get";
            options.Key[this.primary] = primary;
            options.Key[this.sort] = sort;
        } else if (!this.useSort) {
            // the method has received a primary key and we want to retrieve the first matching record
            method = "get";
            options.Key[this.primary] = primary;
        } else {
            // the method has received a primary key and  we want to get all things with that key
            method = "query";
        }

        try {
            switch (method) {
                case "get":
                    console.log("trying db.get with options:", options);
                    result = await this.client.get(options).promise();
                    result = result.Item;
                    console.log(result);
                    break;
                case "query":
                    // construct partiql query to get all items with the primary key provided
                    let statement = `SELECT * FROM "${this.table}" WHERE ${this.primary} = '${primary}'`;
                    console.log("trying db.query with statement:", statement);
                    // execute the statement using this.query method
                    result = await this.query(statement);
                    console.log(result);
                    break;
            }
        } catch (error) {
            console.log("ERROR: getting DDB record: ", error);
            throw error;
        }

        return result;
    }

    async put(data: any, primary: any, sort?: any) {
        type resultType = { [key: string]: any };
        let result: resultType = {};

        let options: PutItemInput = {
            TableName: this.table,
            Item: data,
        };

        options.Item[this.primary] = primary;
        if (this.sort != undefined && sort != undefined) {
            options.Item[this.sort] = sort;
        }

        try {
            console.log("trying db.put with options:", options);
            result = await this.client.put(options).promise();
        } catch (error) {
            console.log("ERROR: putting DDB record: ", error);
            throw error;
        }

        return result;
    }

    async delete(primary: any, sort?: any) {
        type resultType = { [key: string]: any };
        let result: resultType = {};

        let options: GetItemInput = {
            TableName: this.table,
            Key: {},
        };

        options.Key[this.primary] = primary;
        if (this.sort != undefined && sort != undefined) {
            options.Key[this.sort] = sort;
        }

        try {
            result = await this.client.delete(options).promise();
        } catch (error) {
            console.log("ERROR: deleting DDB record: ", error);
            throw error;
        }

        return result;
    }

    // async function query takes statement:PartiQLStatement as input and implements
    // a partiql query against this.queryClient, scans the entire DB if required (recursively)
    async query(partiQLStatement: PartiQLStatement, limit?: number, nextToken?: string) {
        const queryParams: ExecuteStatementInput = {
            // Set up your PartiQL query parameters
            Statement: partiQLStatement, // Your PartiQL statement
            ConsistentRead: true, // Adjust as needed
        };

        if (limit) {
            queryParams.Limit = limit;
        }

        if (nextToken) {
            queryParams.NextToken = nextToken;
        }

        const result: ExecuteStatementOutput = await this.queryClient.executeStatement(queryParams).promise();

        const combinedResults: any[] = result.Items
            ? result.Items.map((item: AWS.DynamoDB.AttributeMap) => AWS.DynamoDB.Converter.unmarshall(item))
            : [];

        if (limit && result.NextToken && combinedResults.length < limit) {
            const remainingLimit = limit - combinedResults.length;
            const remainingResults = await this.query(partiQLStatement, remainingLimit, result.NextToken);
            combinedResults.push(...remainingResults);
        } else if (result.NextToken) {
            const remainingResults = await this.query(partiQLStatement, undefined, result.NextToken);
            combinedResults.push(...remainingResults);
        }

        let unmarshalledResults = combinedResults;
        return combinedResults.slice(0, limit);
    }
}
