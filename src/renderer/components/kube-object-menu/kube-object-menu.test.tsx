/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { KubeObject } from "../../../common/k8s-api/kube-object";
import userEvent from "@testing-library/user-event";
import type { DiContainer } from "@ogre-tools/injectable";
import { ConfirmDialog } from "../confirm-dialog";
import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";

import clusterInjectable from "./dependencies/cluster.injectable";
import hideDetailsInjectable from "./dependencies/hide-details.injectable";
import type { DiRender } from "../test-utils/renderFor";
import { renderFor } from "../test-utils/renderFor";
import type { Cluster } from "../../../common/cluster/cluster";
import type { ApiManager } from "../../../common/k8s-api/api-manager";
import apiManagerInjectable from "./dependencies/api-manager.injectable";
import { KubeObjectMenu } from "./index";
import type { KubeObjectMenuRegistration } from "./kube-object-menu-registration";
import { computed } from "mobx";
import { LensRendererExtension } from "../../../extensions/lens-renderer-extension";
import rendererExtensionsInjectable from "../../../extensions/renderer-extensions.injectable";
import createEditResourceTabInjectable from "../dock/edit-resource/edit-resource-tab.injectable";

// TODO: Make tooltips free of side effects by making it deterministic
jest.mock("../tooltip");

// TODO: make `animated={false}` not required to make tests deterministic

class SomeTestExtension extends LensRendererExtension {
  constructor(
    kubeObjectMenuItems: KubeObjectMenuRegistration[],
  ) {
    super({
      id: "some-id",
      absolutePath: "irrelevant",
      isBundled: false,
      isCompatible: false,
      isEnabled: false,
      manifest: { name: "some-id", version: "some-version" },
      manifestPath: "irrelevant",
    });

    this.kubeObjectMenuItems = kubeObjectMenuItems;
  }
}

describe("kube-object-menu", () => {
  let di: DiContainer;
  let render: DiRender;

  beforeEach(async () => {
    const MenuItemComponent: React.FC = () => <li>Some menu item</li>;

    const kubeObjectMenuItems = [
      {
        apiVersions: ["some-api-version"],
        kind: "some-kind",
        components: { MenuItem: MenuItemComponent },
      },

      {
        apiVersions: ["some-unrelated-api-version"],
        kind: "some-kind",
        components: { MenuItem: MenuItemComponent },
      },

      {
        apiVersions: ["some-api-version"],
        kind: "some-unrelated-kind",
        components: { MenuItem: MenuItemComponent },
      },
    ];

    const someTestExtension = new SomeTestExtension(kubeObjectMenuItems);

    di = getDiForUnitTesting({ doGeneralOverrides: true });

    render = renderFor(di);

    di.override(rendererExtensionsInjectable, () =>
      computed(() => [someTestExtension]),
    );

    await di.runSetups();

    di.override(
      clusterInjectable,
      () =>
        ({
          name: "Some name",
        } as Cluster),
    );

    di.override(
      apiManagerInjectable,
      () =>
        ({
          getStore: (api) => void api,
        } as ApiManager),
    );

    di.override(hideDetailsInjectable, () => () => {});

    di.override(createEditResourceTabInjectable, () => () => "irrelevant");
  });

  it("given no cluster, does not crash", () => {
    di.override(clusterInjectable, () => null);

    expect(() => {
      render(<KubeObjectMenu object={null} toolbar={true} />);
    }).not.toThrow();
  });

  it("given no kube object, renders", () => {
    const { baseElement } = render(
      <KubeObjectMenu object={null} toolbar={true} />,
    );

    expect(baseElement).toMatchSnapshot();
  });

  describe("given kube object", () => {
    let baseElement: Element;
    let removeActionMock: AsyncFnMock<() => void>;

    beforeEach(async () => {
      const objectStub = KubeObject.create({
        apiVersion: "some-api-version",
        kind: "some-kind",
        metadata: {
          uid: "some-uid",
          name: "some-name",
          resourceVersion: "some-resource-version",
          namespace: "some-namespace",
        },
      });

      removeActionMock = asyncFn();

      ({ baseElement } = render(
        <div>
          <ConfirmDialog animated={false} />

          <KubeObjectMenu
            object={objectStub}
            toolbar={true}
            removeAction={removeActionMock}
          />
        </div>,
      ));
    });

    it("renders", () => {
      expect(baseElement).toMatchSnapshot();
    });

    it("does not open a confirmation dialog yet", () => {
      expect(screen.queryByTestId("confirmation-dialog")).toBeNull();
    });

    describe("when removing kube object", () => {
      beforeEach(async () => {
        userEvent.click(await screen.findByTestId("menu-action-delete"));
      });

      it("renders", async () => {
        await screen.findByTestId("confirmation-dialog");
        expect(baseElement).toMatchSnapshot();
      });

      describe("when remove is confirmed", () => {
        beforeEach(async () => {
          const confirmRemovalButton = await screen.findByTestId("confirm");

          userEvent.click(confirmRemovalButton);
        });

        it("calls for removal of the kube object", () => {
          expect(removeActionMock).toHaveBeenCalledWith();
        });

        it("does not close the confirmation dialog yet", async () => {
          await screen.findByTestId("confirmation-dialog");
        });

        it("when removal resolves, closes the confirmation dialog", async () => {
          await removeActionMock.resolve();
          await waitFor(() => {
            expect(screen.queryByTestId("confirmation-dialog")).toBeNull();
          });
        });
      });
    });
  });

  describe("given kube object with namespace", () => {
    let baseElement: Element;

    beforeEach(async () => {
      const objectStub = KubeObject.create({
        apiVersion: "some-api-version",
        kind: "some-kind",
        metadata: {
          uid: "some-uid",
          name: "some-name",
          resourceVersion: "some-resource-version",
          namespace: "some-namespace",
        },
      });

      ({ baseElement } = render(
        <div>
          <ConfirmDialog animated={false} />

          <KubeObjectMenu
            object={objectStub}
            toolbar={true}
            removeAction={() => {}}
          />
        </div>,
      ));
    });

    it("when removing kube object, renders confirmation dialog with namespace", async () => {
      const menuItem = await screen.findByTestId("menu-action-delete");

      userEvent.click(menuItem);

      expect(baseElement).toMatchSnapshot();
    });
  });

  describe("given kube object without namespace", () => {
    let baseElement: Element;

    beforeEach(async () => {
      const objectStub = KubeObject.create({
        apiVersion: "some-api-version",
        kind: "some-kind",
        metadata: {
          uid: "some-uid",
          name: "some-name",
          resourceVersion: "some-resource-version",
          namespace: undefined,
        },
      });

      ({ baseElement } = render(
        <div>
          <ConfirmDialog animated={false} />

          <KubeObjectMenu
            object={objectStub}
            toolbar={true}
            removeAction={() => {}}
          />
        </div>,
      ));
    });

    it("when removing kube object, renders confirmation dialog without namespace", async () => {
      const menuItem = await screen.findByTestId("menu-action-delete");

      userEvent.click(menuItem);

      expect(baseElement).toMatchSnapshot();
    });
  });
});
