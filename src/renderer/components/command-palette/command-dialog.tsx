/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */


import { Select } from "../select";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import React, { useState } from "react";
import commandOverlayInjectable from "./command-overlay.injectable";
import type { CatalogEntity } from "../../../common/catalog";
import { navigate } from "../../navigation";
import { broadcastMessage } from "../../../common/ipc";
import { IpcRendererNavigationEvents } from "../../navigation/events";
import type { RegisteredCommand } from "./registered-commands/commands";
import { iter } from "../../utils";
import { orderBy } from "lodash";
import { withInjectables } from "@ogre-tools/injectable-react";
import registeredCommandsInjectable from "./registered-commands/registered-commands.injectable";
import { catalogEntityRegistry } from "../../api/catalog-entity-registry";

interface Dependencies {
  commands: IComputedValue<Map<string, RegisteredCommand>>;
  activeEntity?: CatalogEntity;
  closeCommandOverlay: () => void;
}

const NonInjectedCommandDialog = observer(({ commands, activeEntity, closeCommandOverlay }: Dependencies) => {
  const [searchValue, setSearchValue] = useState("");

  const executeAction = (commandId: string) => {
    const command = commands.get().get(commandId);

    if (!command) {
      return;
    }

    try {
      closeCommandOverlay();
      command.action({
        entity: activeEntity,
        navigate: (url, opts = {}) => {
          const { forceRootFrame = false } = opts;

          if (forceRootFrame) {
            broadcastMessage(IpcRendererNavigationEvents.NAVIGATE_IN_APP, url);
          } else {
            navigate(url);
          }
        },
      });
    } catch (error) {
      console.error("[COMMAND-DIALOG] failed to execute command", command.id, error);
    }
  };

  const context = {
    entity: activeEntity,
  };
  const activeCommands = iter.filter(commands.get().values(), command => {
    try {
      return command.isActive(context);
    } catch (error) {
      console.error(`[COMMAND-DIALOG]: isActive for ${command.id} threw an error, defaulting to false`, error);
    }

    return false;
  });
  const options = Array.from(activeCommands, ({ id, title }) => ({
    value: id,
    label: typeof title === "function"
      ? title(context)
      : title,
  }));

  // Make sure the options are in the correct order
  orderBy(options, "label", "asc");

  return (
    <Select
      id="command-palette-search-input"
      menuPortalTarget={null}
      onChange={v => executeAction(v.value)}
      components={{
        DropdownIndicator: null,
        IndicatorSeparator: null,
      }}
      menuIsOpen
      options={options}
      autoFocus={true}
      escapeClearsValue={false}
      data-test-id="command-palette-search"
      placeholder="Type a command or search&hellip;"
      onInputChange={(newValue, { action }) => {
        if (action === "input-change") {
          setSearchValue(newValue);
        }
      }}
      inputValue={searchValue}
    />
  );
});

export const CommandDialog = withInjectables<Dependencies>(NonInjectedCommandDialog, {
  getProps: di => ({
    commands: di.inject(registeredCommandsInjectable),
    // TODO: replace with injection
    activeEntity: catalogEntityRegistry.activeEntity,
    closeCommandOverlay: di.inject(commandOverlayInjectable).close,
  }),
});
