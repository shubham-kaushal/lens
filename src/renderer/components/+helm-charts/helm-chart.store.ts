/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import semver from "semver";
import { observable, makeObservable } from "mobx";
import { autoBind, sortCompareChartVersions } from "../../utils";
import type { HelmChart } from "../../../common/k8s-api/endpoints/helm-charts.api";
import { getChartDetails, listCharts } from "../../../common/k8s-api/endpoints/helm-charts.api";
import { ItemStore } from "../../../common/item.store";
import flatten from "lodash/flatten";

export interface IChartVersion {
  repo: string;
  version: string;
}

export class HelmChartStore extends ItemStore<HelmChart> {
  @observable versions = observable.map<string, IChartVersion[]>();

  constructor() {
    super();

    makeObservable(this);
    autoBind(this);
  }

  async loadAll() {
    try {
      const res = await this.loadItems(() => listCharts());

      this.failedLoading = false;

      return res;
    } catch (error) {
      this.failedLoading = true;

      throw error;
    }
  }

  getByName(name: string, repo: string) {
    return this.items.find(chart => chart.getName() === name && chart.getRepository() === repo);
  }

  protected sortVersions = (versions: IChartVersion[]) => {
    return versions
      .map(chartVersion => ({ ...chartVersion, __version: semver.coerce(chartVersion.version, { includePrerelease: true, loose: true }) }))
      .sort(sortCompareChartVersions)
      .map(({ __version, ...chartVersion }) => chartVersion);
  };

  async getVersions(chartName: string, force?: boolean): Promise<IChartVersion[]> {
    let versions = this.versions.get(chartName);

    if (versions && !force) {
      return versions;
    }

    const loadVersions = async (repo: string) => {
      const { versions } = await getChartDetails(repo, chartName);

      return versions.map(chart => ({
        repo,
        version: chart.getVersion(),
      }));
    };

    if (!this.isLoaded) {
      await this.loadAll();
    }
    const repos = this.items
      .filter(chart => chart.getName() === chartName)
      .map(chart => chart.getRepository());

    versions = await Promise.all(repos.map(loadVersions))
      .then(flatten)
      .then(this.sortVersions);

    this.versions.set(chartName, versions);

    return versions;
  }

  reset() {
    super.reset();
    this.versions.clear();
  }
}

export const helmChartStore = new HelmChartStore();
