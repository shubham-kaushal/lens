/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import { autoBind } from "../../utils";
import type { StorageClass } from "../../../common/k8s-api/endpoints/storage-class.api";
import { storageClassApi } from "../../../common/k8s-api/endpoints/storage-class.api";
import { apiManager } from "../../../common/k8s-api/api-manager";
import { volumesStore } from "../+storage-volumes/volumes.store";

export class StorageClassStore extends KubeObjectStore<StorageClass> {
  api = storageClassApi;

  constructor() {
    super();
    autoBind(this);
  }

  getPersistentVolumes(storageClass: StorageClass) {
    return volumesStore.getByStorageClass(storageClass);
  }
}

export const storageClassStore = new StorageClassStore();
apiManager.registerStore(storageClassStore);
