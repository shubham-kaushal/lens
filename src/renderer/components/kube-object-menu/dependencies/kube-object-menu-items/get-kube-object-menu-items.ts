/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { conforms, includes, eq } from "lodash/fp";
import type { KubeObject } from "../../../../../common/k8s-api/kube-object";
import type { LensRendererExtension } from "../../../../../extensions/lens-renderer-extension";
import { staticKubeObjectMenuItems as staticMenuItems } from "../static-kube-object-menu-items";

interface Dependencies {
  extensions: LensRendererExtension[];
  kubeObject: KubeObject;
}

export const getKubeObjectMenuItems = ({
  extensions,
  kubeObject,
}: Dependencies) => {
  if (!kubeObject) {
    return [];
  }

  const extensionMenuItems = extensions.flatMap(
    (extension) => extension.kubeObjectMenuItems,
  );

  return [...staticMenuItems, ...extensionMenuItems]
    .filter(
      conforms({
        kind: eq(kubeObject.kind),
        apiVersions: includes(kubeObject.apiVersion),
      }),
    )
    .map((item) => item.components.MenuItem);
};

