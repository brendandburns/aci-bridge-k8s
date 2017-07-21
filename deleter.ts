import api = require('./typescript/api');
import aci = require('./aci');

import azureResource = require('azure-arm-resource');

export async function ContainerDeleter(client: api.Core_v1Api, rsrcClient: azureResource.ResourceManagementClient, keepRunning: () => boolean) {
    console.log('container deleter');
    try {
        if (!keepRunning()) {
	    return;
        }
        let groups = await aci.ListContainerGroups(rsrcClient);

        let groupMembers = {};
        for (let group of groups) {
            groupMembers[group['name']] = group;
        }

        let pods = await client.listNamespacedPod("default");
        for (let pod of pods.body.items) {
            if (pod.spec.nodeName != "aci-connector") {
                continue;
            }
            if (pod.metadata.deletionTimestamp != null) {
                let group = groupMembers[pod.metadata.name];
                if (group == null) {
                    client.deleteNamespacedPod(pod.metadata.name, 'default', { gracePeriodSeconds: 0 } as api.V1DeleteOptions, "false", 0, true);
                } else {
                    console.log('deleting aci-connector');
                    aci.DeleteContainerGroup(group.id, rsrcClient);
                }
            }
        }
    } catch (Exception) {
        console.log(Exception);
    }

    setTimeout(() => {
        ContainerDeleter(client, rsrcClient, keepRunning);
    }, 1000);
}
