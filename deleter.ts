import api = require('./typescript/api');
import cseries = require('./cseries');

import azureResource = require('azure-arm-resource');

export async function ContainerDeleter(client: api.Core_v1Api, rsrcClient: azureResource.ResourceManagementClient) {
    console.log('container deleter');
    try {
        let groups = await cseries.ListContainerGroups(rsrcClient);

        let groupMembers = {};
        for (let group of groups) {
            groupMembers[group['name']] = group;
        }

        let pods = await client.listNamespacedPod("default");
        for (let pod of pods.body.items) {
            if (pod.spec.nodeName != "cseries") {
                continue;
            }
            if (pod.metadata.deletionTimestamp != null) {
                let group = groupMembers[pod.metadata.name];
                if (group == null) {
                    client.deleteNamespacedPod(pod.metadata.name, 'default', { gracePeriodSeconds: 0 } as api.V1DeleteOptions, "false", 0, true);
                } else {
                    console.log('deleting c-series');
                    cseries.DeleteContainerGroup(group.id, rsrcClient);
                }
            }
        }
    } catch (Exception) {
        console.log(Exception);
    }

    setTimeout(() => {
        ContainerDeleter(client, rsrcClient);
    }, 1000);
}
