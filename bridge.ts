import config = require('./typescript/config');
import deleter = require('./deleter');
import creator = require('./creator');
import synchronizer = require('./synchronizer');
import node = require('./node')

import path = require('path');
import msRestAzure = require('ms-rest-azure');
import azureResource = require('azure-arm-resource');

let FileTokenCache = require('azure/lib/util/fileTokenCache');

//Environment Setup
let client = process.env.AZURE_CLIENT_ID;
let key = process.env.AZURE_CLIENT_KEY;
let tenant = process.env.AZURE_TENANT_ID;
let subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
let resourceGroup = process.env.ACI_RESOURCE_GROUP;

for (let key of ['AZURE_CLIENT_ID', 'AZURE_CLIENT_KEY', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID', 'ACI_RESOURCE_GROUP']) {
    if (!process.env[key]) {
        console.log('${' + key + '} is required');
    }
}

if (!client || !key || !tenant || !subscriptionId) {
    process.exit(1)
}

let tokenCache = new FileTokenCache(path.resolve(path.join(__dirname, './tokenstore.json')));
let credentials = new msRestAzure.ApplicationTokenCredentials(client, tenant, key, { 'tokenCache': tokenCache });

let resourceClient = new azureResource.ResourceManagementClient(credentials, subscriptionId);
let k8sApi = config.Config.defaultClient();

var running = true;
process.on('SIGINT', () => { running = false; });

var keepRunning = () => { return running; }

node.Update(k8sApi, keepRunning);
creator.ContainerCreator(k8sApi, new Date(), resourceClient, keepRunning);
deleter.ContainerDeleter(k8sApi, resourceClient, keepRunning);
synchronizer.Synchronize(k8sApi, new Date(), resourceClient, resourceGroup, keepRunning);
