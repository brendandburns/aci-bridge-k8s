import api = require('./typescript/api');
import aci = require('./aci');

import azureResource = require('azure-arm-resource');

export async function ContainerCreator(client: api.Core_v1Api, startDate: Date, rsrcClient: azureResource.ResourceManagementClient) {
    console.log('k8s pod creater/updater');
    try {
        let groups = await aci.ListContainerGroups(rsrcClient);

        for (let containerGroup of groups) {
            console.log(containerGroup['name']);
            if (!containerGroup['tags'] || containerGroup['tags']['orchestrator'] != 'kubernetes') {
                continue;
            }
            let exists = true;
            try {
                let pod = await client.readNamespacedPod(containerGroup['name'], "default");
            } catch (Exception) {
                console.log(Exception);
                exists = false;
            }
            let pod = {
                apiVersion: 'v1',
                metadata: {
                    name: containerGroup['name'],
                    namespace: 'default'
                } as api.V1ObjectMeta,
                spec: {
                    nodeName: 'aci-bridge'
                } as api.V1PodSpec,
                status: {
                    podIP: containerGroup['properties']['ipAddress'] ? containerGroup['properties']['ipAddress']['ip'] : null,
                    phase: "Running",
                    startTime: startDate,
                    conditions: [
                        {
                            lastTransitionTime: startDate,
                            status: "True",
                            type: "Initialized"
                        } as api.V1PodCondition,
                        {
                            lastTransitionTime: startDate,
                            status: "True",
                            type: "PodScheduled"
                        } as api.V1PodCondition,
                        {
                            lastTransitionTime: startDate,
                            status: "True",
                            type: "Ready"
                        } as api.V1PodCondition
                    ] as Array<api.V1PodCondition>
                } as api.V1PodStatus
            } as api.V1Pod;
            let containers = new Array<api.V1Container>();
            let containerStatuses = new Array<api.V1ContainerStatus>();
            for (let container of containerGroup['properties']['containers']) {
                containers.push(
                    {
                        name: container['name'],
                        image: container['properties']['image']
                    } as api.V1Container
                );
                containerStatuses.push(
                    {
                        name: container['name'],
                        image: container['properties']['image'],
                        ready: true,
                        state: {
                            running: {
                                startedAt: startDate
                            } as api.V1ContainerStateRunning
                        } as api.V1ContainerState
                    } as api.V1ContainerStatus
                );
            }
            pod.spec.containers = containers;
            pod.status.containerStatuses = containerStatuses;
            try {
                if (!exists) {
                    await client.createNamespacedPod("default", pod);
                } else {
                    await client.replaceNamespacedPodStatus(pod.metadata.name, "default", pod);
                }
            } catch (Exception) {
                console.log(Exception);
            }
        }
    } catch (Exception) {
        console.log(Exception);
    }
    setTimeout(() => {
        ContainerCreator(client, startDate, rsrcClient);
    }, 5000);
}
