import api = require('./typescript/api');
import cseries = require('./cseries');

export async function Synchronize(client: api.Core_v1Api, startTime: Date, rsrcClient) {
    try {
        console.log('container scheduler');
        let groupObj = await cseries.ListContainerGroups(rsrcClient);
        let groups = groupObj as Array<Object>;

        let groupMembers = {};
        for (let group of groups) {
            groupMembers[group['name']] = group;
        }

        let pods = await client.listNamespacedPod('default');
        for (let pod of pods.body.items) {
            if (pod.spec.nodeName != 'cseries') {
                continue;
            }
            if (groupMembers[pod.metadata.name] != null) {
                continue;
            }
            let containers = new Array<Object>();
            for (let container of pod.spec.containers) {
                let ports = new Array<Object>();
                // TODO: actually read ports here...
                ports.push({
                    port: 80
                });
                containers.push(
                    {
                        name: container.name,
                        properties: {
                            ports: ports,
                            image: container.image
                        }
                    }
                );
            }
            let ports = new Array<Object>();
            ports.push({
                protocol: 'TCP',
                port: 80
            });
            let tags = {
                "orchestrator": "kubernetes"
            };
            let group = {
                properties: {
                    osType: "linux",
                    containers: containers,
                    ipAddress: {
                        type: "Public",
                        ports: ports
                    }
                },
                tags: tags,
                location: "westus"
            }
            await rsrcClient.resources.createOrUpdate("bburns-test",
                "Microsoft.Container", "",
                "containerGroups", pod.metadata.name,
                '2017-04-01-preview', group, (err, result, request, response) => {
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
        Synchronize(client, startTime, rsrcClient);
    }, 5000);
};