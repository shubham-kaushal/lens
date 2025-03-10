/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { navigate } from "../../renderer/navigation";
import type { CatalogEntityMetadata, CatalogEntitySpec, CatalogEntityStatus } from "../catalog";
import { CatalogCategory, CatalogEntity } from "../catalog";
import { catalogCategoryRegistry } from "../catalog/catalog-category-registry";

interface GeneralEntitySpec extends CatalogEntitySpec {
  path: string;
  icon?: {
    material?: string;
    background?: string;
  };
}

export class GeneralEntity extends CatalogEntity<CatalogEntityMetadata, CatalogEntityStatus, GeneralEntitySpec> {
  public readonly apiVersion = "entity.k8slens.dev/v1alpha1";
  public readonly kind = "General";

  async onRun() {
    navigate(this.spec.path);
  }

  public onSettingsOpen(): void {
    return;
  }

  public onDetailsOpen(): void {
    return;
  }

  public onContextMenuOpen(): void {
    return;
  }
}

export class GeneralCategory extends CatalogCategory {
  public readonly apiVersion = "catalog.k8slens.dev/v1alpha1";
  public readonly kind = "CatalogCategory";
  public metadata = {
    name: "General",
    icon: "settings",
  };
  public spec = {
    group: "entity.k8slens.dev",
    versions: [
      {
        name: "v1alpha1",
        entityClass: GeneralEntity,
      },
    ],
    names: {
      kind: "General",
    },
  };
}

catalogCategoryRegistry.add(new GeneralCategory());
