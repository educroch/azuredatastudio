/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/base/common/event';
import { TernarySearchTree } from 'vs/base/common/ternarySearchTree';
import { URI } from 'vs/base/common/uri';
import { getConfigurationValue, IConfigurationChangeEvent, IConfigurationOverrides, IConfigurationService, IConfigurationValue, isConfigurationOverrides } from 'vs/platform/configuration/common/configuration';
import { Extensions, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import { Registry } from 'vs/platform/registry/common/platform';

export class TestConfigurationService implements IConfigurationService {
	public _serviceBrand: undefined;

	private configuration: any;
	readonly onDidChangeConfigurationEmitter = new Emitter<IConfigurationChangeEvent>();
	readonly onDidChangeConfiguration = this.onDidChangeConfigurationEmitter.event;

	constructor(configuration?: any) {
		// {{SQL CARBON EDIT}} - START
		// Ensures that all configuration services use the DOM renderer. There's an issue
		// with GPU rendering that is causing unit tests to be flaky and obscuring true failing tests.
		// This is a temporary fix and should be removed once xterm GPU rendering is working again.
		if (configuration) {
			if (configuration.integrated) {
				configuration.integrated.gpuAcceleration = 'off';
			}
			else {
				configuration.integrated = { gpuAcceleration: 'off' };
			}
		}
		else {
			configuration = { integrated: { gpuAcceleration: 'off' } };
		}
		// {{SQL CARBON EDIT}} - END

		this.configuration = configuration || Object.create(null);
	}

	private configurationByRoot: TernarySearchTree<string, any> = TernarySearchTree.forPaths<any>();

	public reloadConfiguration<T>(): Promise<T> {
		return Promise.resolve(this.getValue());
	}

	public getValue(arg1?: any, arg2?: any): any {
		let configuration;
		const overrides = isConfigurationOverrides(arg1) ? arg1 : isConfigurationOverrides(arg2) ? arg2 : undefined;
		if (overrides) {
			if (overrides.resource) {
				configuration = this.configurationByRoot.findSubstr(overrides.resource.fsPath);
			}
		}
		configuration = configuration ? configuration : this.configuration;
		if (arg1 && typeof arg1 === 'string') {
			return configuration[arg1] ?? getConfigurationValue(configuration, arg1);
		}
		return configuration;
	}

	public updateValue(key: string, value: any): Promise<void> {
		return Promise.resolve(undefined);
	}

	public setUserConfiguration(key: any, value: any, root?: URI): Promise<void> {
		if (root) {
			const configForRoot = this.configurationByRoot.get(root.fsPath) || Object.create(null);
			configForRoot[key] = value;
			this.configurationByRoot.set(root.fsPath, configForRoot);
		} else {
			this.configuration[key] = value;
		}

		return Promise.resolve(undefined);
	}

	private overrideIdentifiers: Map<string, string[]> = new Map();
	public setOverrideIdentifiers(key: string, identifiers: string[]): void {
		this.overrideIdentifiers.set(key, identifiers);
	}

	public inspect<T>(key: string, overrides?: IConfigurationOverrides): IConfigurationValue<T> {
		const config = this.getValue(undefined, overrides);

		return {
			value: getConfigurationValue<T>(config, key),
			defaultValue: getConfigurationValue<T>(config, key),
			userValue: getConfigurationValue<T>(config, key),
			overrideIdentifiers: this.overrideIdentifiers.get(key)
		};
	}

	public keys() {
		return {
			default: Object.keys(Registry.as<IConfigurationRegistry>(Extensions.Configuration).getConfigurationProperties()),
			user: Object.keys(this.configuration),
			workspace: [],
			workspaceFolder: []
		};
	}

	public getConfigurationData() {
		return null;
	}
}
