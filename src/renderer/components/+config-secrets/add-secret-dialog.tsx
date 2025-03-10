/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./add-secret-dialog.scss";

import React from "react";
import { observable, makeObservable } from "mobx";
import { observer } from "mobx-react";
import type { DialogProps } from "../dialog";
import { Dialog } from "../dialog";
import { Wizard, WizardStep } from "../wizard";
import { Input } from "../input";
import { systemName } from "../input/input_validators";
import type { Secret } from "../../../common/k8s-api/endpoints";
import { secretsApi, SecretType } from "../../../common/k8s-api/endpoints";
import { SubTitle } from "../layout/sub-title";
import { NamespaceSelect } from "../+namespaces/namespace-select";
import type { SelectOption } from "../select";
import { Select } from "../select";
import { Icon } from "../icon";
import type { KubeObjectMetadata } from "../../../common/k8s-api/kube-object";
import { base64 } from "../../utils";
import { Notifications } from "../notifications";
import upperFirst from "lodash/upperFirst";
import { showDetails } from "../kube-detail-params";

export interface AddSecretDialogProps extends Partial<DialogProps> {
}

interface ISecretTemplateField {
  key: string;
  value?: string;
  required?: boolean;
}

interface ISecretTemplate {
  [field: string]: ISecretTemplateField[];
  annotations?: ISecretTemplateField[];
  labels?: ISecretTemplateField[];
  data?: ISecretTemplateField[];
}

type ISecretField = keyof ISecretTemplate;

const dialogState = observable.object({
  isOpen: false,
});

@observer
export class AddSecretDialog extends React.Component<AddSecretDialogProps> {
  constructor(props: AddSecretDialogProps) {
    super(props);
    makeObservable(this);
  }

  static open() {
    dialogState.isOpen = true;
  }

  static close() {
    dialogState.isOpen = false;
  }

  private secretTemplate: { [p: string]: ISecretTemplate } = {
    [SecretType.Opaque]: {},
    [SecretType.ServiceAccountToken]: {
      annotations: [
        { key: "kubernetes.io/service-account.name", required: true },
        { key: "kubernetes.io/service-account.uid", required: true },
      ],
    },
  };

  get types() {
    return Object.keys(this.secretTemplate) as SecretType[];
  }

  @observable secret = this.secretTemplate;
  @observable name = "";
  @observable namespace = "default";
  @observable type = SecretType.Opaque;

  reset = () => {
    this.name = "";
    this.secret = this.secretTemplate;
  };

  close = () => {
    AddSecretDialog.close();
  };

  private getDataFromFields = (fields: ISecretTemplateField[] = [], processValue?: (val: string) => string) => {
    return fields.reduce<any>((data, field) => {
      const { key, value } = field;

      if (key) {
        data[key] = processValue ? processValue(value) : value;
      }

      return data;
    }, {});
  };

  createSecret = async () => {
    const { name, namespace, type } = this;
    const { data = [], labels = [], annotations = [] } = this.secret[type];
    const secret: Partial<Secret> = {
      type,
      data: this.getDataFromFields(data, val => val ? base64.encode(val) : ""),
      metadata: {
        name,
        namespace,
        annotations: this.getDataFromFields(annotations),
        labels: this.getDataFromFields(labels),
      } as KubeObjectMetadata,
    };

    try {
      const newSecret = await secretsApi.create({ namespace, name }, secret);

      showDetails(newSecret.selfLink);
      this.close();
    } catch (err) {
      Notifications.error(err);
    }
  };

  addField = (field: ISecretField) => {
    const fields = this.secret[this.type][field] || [];

    fields.push({ key: "", value: "" });
    this.secret[this.type][field] = fields;
  };

  removeField = (field: ISecretField, index: number) => {
    const fields = this.secret[this.type][field] || [];

    fields.splice(index, 1);
  };

  renderFields(field: ISecretField) {
    const fields = this.secret[this.type][field] || [];

    return (
      <>
        <SubTitle compact className="fields-title" title={upperFirst(field.toString())}>
          <Icon
            small
            tooltip="Add field"
            material="add_circle_outline"
            onClick={() => this.addField(field)}
          />
        </SubTitle>
        <div className="secret-fields">
          {fields.map((item, index) => {
            const { key = "", value = "", required } = item;

            return (
              <div key={index} className="secret-field flex gaps auto align-center">
                <Input
                  className="key"
                  placeholder="Name"
                  title={key}
                  tabIndex={required ? -1 : 0}
                  readOnly={required}
                  value={key} onChange={v => item.key = v}
                />
                <Input
                  multiLine maxRows={5}
                  required={required}
                  className="value"
                  placeholder="Value"
                  value={value} onChange={v => item.value = v}
                />
                <Icon
                  small
                  disabled={required}
                  tooltip={required ? "Required field" : "Remove field"}
                  className="remove-icon"
                  material="remove_circle_outline"
                  onClick={() => this.removeField(field, index)}
                />
              </div>
            );
          })}
        </div>
      </>
    );
  }

  render() {
    const { ...dialogProps } = this.props;
    const { namespace, name, type } = this;
    const header = <h5>Create Secret</h5>;

    return (
      <Dialog
        {...dialogProps}
        className="AddSecretDialog"
        isOpen={dialogState.isOpen}
        onOpen={this.reset}
        close={this.close}
      >
        <Wizard header={header} done={this.close}>
          <WizardStep contentClass="flow column" nextLabel="Create" next={this.createSecret}>
            <div className="secret-name">
              <SubTitle title="Secret name" />
              <Input
                autoFocus required
                placeholder="Name"
                trim
                validators={systemName}
                value={name} onChange={v => this.name = v}
              />
            </div>
            <div className="flex auto gaps">
              <div className="secret-namespace">
                <SubTitle title="Namespace" />
                <NamespaceSelect
                  id="secret-namespace-input"
                  themeName="light"
                  value={namespace}
                  onChange={({ value }) => this.namespace = value}
                />
              </div>
              <div className="secret-type">
                <SubTitle title="Secret type" />
                <Select
                  id="secret-input"
                  themeName="light"
                  options={this.types}
                  value={type} onChange={({ value }: SelectOption) => this.type = value}
                />
              </div>
            </div>
            {this.renderFields("annotations")}
            {this.renderFields("labels")}
            {this.renderFields("data")}
          </WizardStep>
        </Wizard>
      </Dialog>
    );
  }
}
