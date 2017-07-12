import api = require('./typescript/api');
import cseries = require('./cseries');

let handleError = (err: Error) => {
    console.log('Error!');
    console.log(err);
};

let updateNode = async (name: string, transition: Date, client: api.Core_v1Api) => {
    console.log("sending update.");
    try {
        let result = await client.readNode(name);
        let node = result.body as api.V1Node;
        let conditions = [
            {
                lastHeartbeatTime: new Date(),
                lastTransitionTime: transition,
                message: "kubelet is posting ready",
                reason: "KubeletReady",
                status: "True",
                type: "Ready"
            } as api.V1NodeCondition,
            {
                lastHeartbeatTime: new Date(),
                lastTransitionTime: transition,
                message: "kubelet has sufficient disk space available",
                reason: "KubeletHasSufficientDisk",
                status: "False",
                type: "OutOfDisk"
            } as api.V1NodeCondition
        ] as Array<api.V1NodeCondition>;
        node.metadata.resourceVersion = null;
        node.status = {
            nodeInfo: {
                kubeletVersion: "1.6.6"
            } as api.V1NodeSystemInfo,
            conditions: conditions
        } as api.V1NodeStatus;

        await client.replaceNodeStatus(node.metadata.name, node);
    } catch (Exception) {
        console.log(Exception);
    }
    setTimeout(() => {
        updateNode(name, transition, client);
    }, 5000);
};

export async function Update(client: api.Core_v1Api) {
    try {
        let result = await client.listNode();
        let found = false;
        for (let item of result.body.items) {
            if (item.metadata.name == 'cseries') {
                found = true;
                break;
            }
        }
        let transition = new Date();
        let status = {
            conditions: [
                {
                    lastHeartbeatTime: new Date(),
                    lastTransitionTime: transition,
                    message: "kubelet is posting ready",
                    reason: "KubeletReady",
                    status: "True",
                    type: "Ready"
                } as api.V1NodeCondition,
                {
                    lastHeartbeatTime: new Date(),
                    lastTransitionTime: transition,
                    message: "kubelet has sufficient disk space available",
                    reason: "KubeletHasSufficientDisk",
                    status: "False",
                    type: "OutOfDisk"
                } as api.V1NodeCondition
            ] as Array<api.V1NodeCondition>,
            nodeInfo: {
                kubeletVersion: "1.6.6"
            } as api.V1NodeSystemInfo
        } as api.V1NodeStatus;
        let node = {
            apiVersion: "v1",
            kind: "Node",
            metadata: {
                name: "cseries"
            } as api.V1ObjectMeta,
            spec: null,
            status: status
        } as api.V1Node;
        if (found) {
            console.log('found c-series!');
        } else {
            console.log('creating c-series');

            await client.createNode(node);
        }
        setTimeout(() => {
            updateNode(node.metadata.name, transition, client);
        }, 5000);
    } catch (Exception) {
        console.log(Exception);
    }
};