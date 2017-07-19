import azureResource = require('azure-arm-resource');
import rest = require('ms-rest');

export async function getResource(client: azureResource.ResourceManagementClient, id: string, version: string): Promise<Object> {
    let promise = new Promise((resolve, reject) => {
        client.resources.getById(id, version, function (err, result) {
            if (err) {
                if ((err as rest.ServiceError).statusCode != 404) {
                    reject(err);
                } else {
                    resolve(null);
                }
            } else {
                resolve(result);
            }
        });
    });
    return promise;
}

export async function getMatchingResources(client: azureResource.ResourceManagementClient, type:string, version: string): Promise<Array<Object>> {
    let result = new Promise<Array<Object>>((resolve, reject) => {
        client.resources.list(async function (err, result, request, response) {
            if (err) {
                console.log(err);
            } else {
                let arr = [];
                for (let rsrc of result) {
                    if (rsrc.type == type) {
                        try {
                            let obj = await getResource(client, rsrc.id, version);
                            if (obj != null) {
                                arr.push(obj);
                            }
                        } catch (Exception) {
                            console.log(Exception);
                            reject(Exception);
                            return;
                        }
                    }
                }
                resolve(arr);
            }
        });
    });
    return result;
};

export function createResource(client: azureResource.ResourceManagementClient, group: string, namespace: string, type: string, name: string, params: Object, version: string) {
    let result = new Promise((resolve, reject) => {
        client.resources.createOrUpdate(group, namespace, '', type, name, version, params, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });
    return result;
}

export function deleteResource(client, id, version) {
    let promise = new Promise((resolve, reject) => {
        client.resources.deleteById(id, version, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
    return promise;
}
