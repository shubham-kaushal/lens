/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { ExtendableDisposer } from "../../../../common/utils";
import { downloadFile } from "../../../../common/utils";
import { InputValidators } from "../../input";
import { getMessageFromError } from "../get-message-from-error/get-message-from-error";
import logger from "../../../../main/logger";
import { Notifications } from "../../notifications";
import path from "path";
import React from "react";
import { readFileNotify } from "../read-file-notify/read-file-notify";
import type { InstallRequest } from "../attempt-install/install-request";
import type { ExtensionInfo } from "../attempt-install-by-info.injectable";
import type { ExtensionInstallationStateStore } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";

interface Dependencies {
  attemptInstall: (request: InstallRequest, disposer?: ExtendableDisposer) => Promise<void>;
  attemptInstallByInfo: (extensionInfo: ExtensionInfo) => Promise<void>;
  extensionInstallationStateStore: ExtensionInstallationStateStore;
}

export const installFromInput = ({ attemptInstall, attemptInstallByInfo, extensionInstallationStateStore }: Dependencies) => async (input: string) => {
  let disposer: ExtendableDisposer | undefined = undefined;

  try {
    // fixme: improve error messages for non-tar-file URLs
    if (InputValidators.isUrl.validate(input)) {
      // install via url
      disposer = extensionInstallationStateStore.startPreInstall();
      const { promise } = downloadFile({ url: input, timeout: 10 * 60 * 1000 });
      const fileName = path.basename(input);

      await attemptInstall({ fileName, dataP: promise }, disposer);
    } else if (InputValidators.isPath.validate(input)) {
      // install from system path
      const fileName = path.basename(input);

      await attemptInstall({ fileName, dataP: readFileNotify(input) });
    } else if (InputValidators.isExtensionNameInstall.validate(input)) {
      const [{ groups: { name, version }}] = [...input.matchAll(InputValidators.isExtensionNameInstallRegex)];

      await attemptInstallByInfo({ name, version });
    }
  } catch (error) {
    const message = getMessageFromError(error);

    logger.info(`[EXTENSION-INSTALL]: installation has failed: ${message}`, { error, installPath: input });
    Notifications.error(<p>Installation has failed: <b>{message}</b></p>);
  } finally {
    disposer?.();
  }
};
