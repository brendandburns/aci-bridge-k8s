import config = require('./typescript/config');
import deleter = require('./deleter');
import creator = require('./creator');
import synchronizer = require('./synchronizer');
import node = require('./node')

import path = require('path');
import msRestAzure = require('ms-rest-azure');
import azureResource = require('azure-arm-resource');

let interactiveCredentials = (): Promise<Object> => {
    let result = new Promise((resolve, reject) => {
        msRestAzure.interactiveLogin((err, credentials) => {
	    if (err) {
	        reject(err);
            } else {
	        resolve(credentials);
	    }
        });
    });
    return result;
}

let main = async () => {
    let FileTokenCache = require('azure/lib/util/fileTokenCache');

    //Environment Setup
    let client = process.env.AZURE_CLIENT_ID;
    let key = process.env.AZURE_CLIENT_KEY;
    let tenant = process.env.AZURE_TENANT_ID;
    let subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    let resourceGroup = process.env.ACI_RESOURCE_GROUP;

    for (let key of ['AZURE_SUBSCRIPTION_ID', 'ACI_RESOURCE_GROUP']) {
        if (!process.env[key]) {
            console.log('${' + key + '} is required');
        }
    }

    if (!subscriptionId || !resourceGroup) {
        process.exit(1)
    }

    let credentials = null;
    if (client || key || tenant) {
        for (let key of ['AZURE_CLIENT_ID', 'AZURE_CLIENT_KEY', 'AZURE_TENANT_ID']) {
	    if (!process.env[key]) {
                console.log('${' + key + '} is required');
	    }
        }
        if (!client || !key || !tenant) {
	    process.exit(1);
        }
        let tokenCache = new FileTokenCache(path.resolve(path.join(__dirname, './tokenstore.json')));
        credentials = new msRestAzure.ApplicationTokenCredentials(client, tenant, key, { 'tokenCache': tokenCache });
    } else {
        credentials = await interactiveCredentials();
    }

    let running = true;
    process.on('SIGINT', () => {
        console.log('Exiting...');
        running = false;
        // We should really exit via other means before this, but if that fails, kill it hard.
        setTimeout(() => { process.exit(0); }, 10000).unref();
    });
    let keepRunning = () => { return running; }

    let resourceClient = new azureResource.ResourceManagementClient(credentials, subscriptionId);
    let k8sApi = config.Config.defaultClient();

    node.Update(k8sApi, keepRunning);
    creator.ContainerCreator(k8sApi, new Date(), resourceClient, keepRunning);
    deleter.ContainerDeleter(k8sApi, resourceClient, keepRunning);
    synchronizer.Synchronize(k8sApi, new Date(), resourceClient, resourceGroup, keepRunning);
}

main();

