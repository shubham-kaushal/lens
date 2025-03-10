/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RequestPromiseOptions } from "request-promise-native";
import request from "request-promise-native";
import { apiKubePrefix } from "../common/vars";
import type { IMetricsReqParams } from "../common/k8s-api/endpoints/metrics.api";
import { LensProxy } from "./lens-proxy";
import type { Cluster } from "../common/cluster/cluster";

export async function k8sRequest<T = any>(cluster: Cluster, path: string, options: RequestPromiseOptions = {}): Promise<T> {
  const kubeProxyUrl = `http://localhost:${LensProxy.getInstance().port}${apiKubePrefix}`;

  options.headers ??= {};
  options.json ??= true;
  options.timeout ??= 30000;
  options.headers.Host = `${cluster.id}.${new URL(kubeProxyUrl).host}`; // required in ClusterManager.getClusterForRequest()

  return request(kubeProxyUrl + path, options);
}

export async function getMetrics(cluster: Cluster, prometheusPath: string, queryParams: IMetricsReqParams & { query: string }): Promise<any> {
  const prometheusPrefix = cluster.preferences.prometheus?.prefix || "";
  const metricsPath = `/api/v1/namespaces/${prometheusPath}/proxy${prometheusPrefix}/api/v1/query_range`;

  return k8sRequest(cluster, metricsPath, {
    timeout: 0,
    resolveWithFullResponse: false,
    json: true,
    method: "POST",
    form: queryParams,
  });
}
