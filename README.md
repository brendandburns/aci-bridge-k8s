# ACI Bridge for Kubernetes (experimental)

ACI Bridge for Kubernetes is an open-source connector that enables Kubernetes clusters to deploy Azure Container Instances.

This enables on-demand and nearly instantaneous container compute, orchestrated by Kubernetes, without having VM infrastructure to manage and while still leveraging the portable Kubernetes API. This will allow you to utilize both VMs and container instances simultaneously in the same K8s cluster, giving you the best of both worlds.

Please note this software is experimental and should not be used for anything resembling a production workload.

## How does it Work

The ACI Bridge roughly mimics the [Kubelet](https://kubernetes.io/docs/admin/kubelet/) interface by:

- Registering into the Kubernetes data plane as a `Node` with unlimited capacity
- Dispatching scheduled `Pods` to Azure Container Instances instead of a VM-based container engine

Once the bridge is registered as a node called `aci-bridge`, you can use `nodeName: aci-bridge` in 
your Pod spec run the Pod via ACI.  Pods without this node selector will continue to be scheduled normally.

## Requirements

 1. A working `az` command-line client
 2. A Kubernetes cluster with a working `kubectl`

## Quickstart

1. Edit `examples/aci-bridge.yaml` and supply environment variables
2. Run the ACI Bridge with `kubectl create -f examples/aci-bridge.yaml`
3. Wait for `kubectl get nodes` to display the `aci-bridge` node
4. Run an NGINX pod via ACI using `kubectl create -f examples/nginx-pod.yaml`
5. Access the NGINX pod via its public address

## Usage

### Create a Service Principal

A service principal is required to allow the ACI Bridge to create resources in your Azure subscription.
You can create one using the `az` CLI using the instructions below.

Find your `subscriptionId` with the `az` CLI:

```console
$ az account list -o table
Name                                             CloudName    SubscriptionId                        State    IsDefault
-----------------------------------------------  -----------  ------------------------------------  -------  -----------
Pay-As-You-Go                                    AzureCloud   12345678-9012-3456-7890-123456789012  Enabled  True
```

Use `az` to create a Service Principal that can perform operations on your subscription:

```console
$ az ad sp create-for-rbac --role=Contributor --scopes /subscriptions/<subscription-id>
{
  "appId": "<redacted>",
  "displayName": "azure-cli-2017-07-19-19-13-19",
  "name": "http://azure-cli-2017-07-19-19-13-19",
  "password": "<redacted>",
  "tenant": "<redacted>"
}
```

Edit the `examples/aci-bridge.yaml` and input environment variables using the values above:

- AZURE_CLIENT_ID: <appId>
- AZURE_CLIENT_KEY: <password>
- AZURE_TENANT_ID: <tenant>
- AZURE_SUBSCRIPTION_ID: <subscriptionId>

### Create a Resource Group

The ACI Bridge will create each container instance in a specified resource group.
You can create a new resource group with:

```console
$ az group create -n aci-test -l westus
{
  "id": "/subscriptions/<subscriptionId>/resourceGroups/aci-test",
  "location": "westus",
  "managedBy": null,
  "name": "aci-test",
  "properties": {
    "provisioningState": "Succeeded"
  },
  "tags": null
}
```

Edit the `examples/aci-bridge.yaml` and put the name of the resource group into the `ACI_RESOURCE_GROUP`
environment variable.

### Install the ACI Bridge

```console
$ kubectl create -f examples/aci-bridge.yaml 
pod "aci-bridge" created

$ kubectl get nodes -w
NAME                        STATUS                     AGE       VERSION
aci-bridge                  Ready                      3s        1.6.6
k8s-agentpool1-31868821-0   Ready                      5d        v1.7.0
k8s-agentpool1-31868821-1   Ready                      5d        v1.7.0
k8s-agentpool1-31868821-2   Ready                      5d        v1.7.0
k8s-master-31868821-0       Ready,SchedulingDisabled   5d        v1.7.0
```

### Install the NGINX example

```console
$ kubectl create -f examples/nginx-pod.yaml 
pod "nginx" created

$ kubectl get po -w -o wide
NAME         READY     STATUS    RESTARTS   AGE       IP             NODE
aci-bridge   1/1       Running   0          44s       10.244.2.21    k8s-agentpool1-31868821-2
nginx        1/1       Running   0          31s       13.88.27.150   aci-bridge
```

Note the pod is scheduled on the `aci-bridge` node.  It should now be accessible at the public IP listed.

## Development Instructions

### Local Development

```console
<edit source>
$ make clean
$ make build
$ tsc bridge.ts
$ node bridge.js
```

### Docker Development

```console
make docker-build
docker tag <local-image> <remote-image>
docker push <remote-image>
```

Then edit `examples/aci-bridge.yaml` to point to the `remote-image`.

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.