import api = require('@kubernetes/typescript-node');

let handleError = (err: Error) => {
    console.log('Error!');
    console.log(err);
};

let updateNode = async (name: string, transition: Date, client: api.Core_v1Api, keepRunning: () => boolean) => {
    console.log("sending update.");
    try {
        if (!keepRunning()) {
		return;
	}
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
                kubeletVersion: "1.6.6",
                architecture: "amd64"
            } as api.V1NodeSystemInfo,
            conditions: conditions,
            addresses: [] as Array<api.V1NodeAddress>
        } as api.V1NodeStatus;
        node.status.allocatable = {
            "cpu": "20",
            "memory": "100Gi",
            "pods": "20"
        };
        // TODO: Count quota here...
        node.status.capacity = node.status.allocatable;

        await client.replaceNodeStatus(node.metadata.name, node);
    } catch (Exception) {
        console.log(Exception);
    }
    setTimeout(() => {
        updateNode(name, transition, client, keepRunning);
    }, 5000);
};

export async function Update(client: api.Core_v1Api, keepRunning: () => boolean) {
    try {
        let result = await client.listNode();
        let found = false;
        for (let item of result.body.items) {
            if (item.metadata.name == 'aci-connector') {
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
                name: "aci-connector"
            } as api.V1ObjectMeta,
            spec: {
                taints: [
                    {
                       key: "azure.com/aci",
                       effect: "NoSchedule"
                    } as api.V1Taint
                ] as Array<api.V1Taint>
            } as api.V1NodeSpec,
            status: status
        } as api.V1Node;
        if (found) {
            console.log('found aci-connector!');
        } else {
            console.log('creating aci-connector');

            await client.createNode(node);
        }
        setTimeout(() => {
            updateNode(node.metadata.name, transition, client, keepRunning);
        }, 5000);
    } catch (Exception) {
        console.log(Exception);
    }
};
