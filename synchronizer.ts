import api = require('@kubernetes/typescript-node');
import aci = require('./aci');
import azureResource = require('azure-arm-resource');

export async function Synchronize(client: api.Core_v1Api, startTime: Date, rsrcClient: azureResource.ResourceManagementClient, resourceGroup: string, region: string, keepRunning: () => boolean) {
    console.log('container scheduler');
    try {
        if (!keepRunning()) {
            return;
        }
        let groupObj = await aci.ListContainerGroups(rsrcClient);
        let groups = groupObj as Array<Object>;

        let groupMembers = {};
        for (let group of groups) {
            groupMembers[group['name']] = group;
        }

        // TODO: all namespaces here
        let pods = await client.listNamespacedPod('default');
        for (let pod of pods.body.items) {
            if (pod.spec.nodeName != 'aci-connector') {
                continue;
            }
            if (groupMembers[pod.metadata.name] != null) {
                continue;
            }
            let containers = new Array<Object>();
            let cPorts = new Array<Object>();
            for (let container of pod.spec.containers) {
                let ports = new Array<Object>();
                if (container.ports) {
                    for (let port of container.ports) {
                        ports.push({
                            port: port.containerPort
                        });
                        cPorts.push({
                            protocol: port.protocol,
                            port: port.containerPort
                        });
                    }
                } else {
                    ports.push({
                        port: 80
                    });
                    cPorts.push({
                        protocol: 'TCP',
                        port: 80
                    });
                }
                containers.push(
                    {
                        name: container.name,
                        properties: {
                            ports: ports,
                            image: container.image,
                            resources: {
                                requests: {
                                    cpu: 1,
                                    memoryInGB: 1.5
                                }
                            }
                        }
                    }
                );
            }
            let group = {
                properties: {
                    osType: "linux",
                    containers: containers,
                    ipAddress: {
		        // TODO: use a tag to make Public IP optional.
                        type: "Public",
                        ports: cPorts
                    }
                },
                tags: {
                    "orchestrator": "kubernetes"
                },
                location: region
            }
            await rsrcClient.resources.createOrUpdate(resourceGroup,
                "Microsoft.ContainerInstance", "",
                "containerGroups", pod.metadata.name,
                '2017-08-01-preview', group, (err, result, request, response) => {
                    if (err) {
                        console.log(err);
                    } else {
                        //console.log(result);
                    }
                });
        }
    } catch (Exception) {
        console.log(Exception);
    }
    setTimeout(() => {
        Synchronize(client, startTime, rsrcClient, resourceGroup, region, keepRunning);
    }, 5000);
};
