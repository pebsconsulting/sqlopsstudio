/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as types from 'vs/base/common/types';
import { generateUuid } from 'vs/base/common/uuid';
import { Registry } from 'vs/platform/registry/common/platform';
import { error } from 'sql/base/common/log';
import * as nls from 'vs/nls';
import { WidgetConfig } from 'sql/parts/dashboard/common/dashboardWidget';
import { Extensions, IInsightRegistry } from 'sql/platform/dashboard/common/insightRegistry';
import { ConnectionManagementInfo } from 'sql/parts/connection/common/connectionManagementInfo';
import { DashboardServiceInterface } from 'sql/parts/dashboard/services/dashboardServiceInterface.service';
import { WIDGETS_CONTAINER } from 'sql/parts/dashboard/containers/dashboardWidgetContainer.contribution';
import { GRID_CONTAINER } from 'sql/parts/dashboard/containers/dashboardGridContainer.contribution';
import { WEBVIEW_CONTAINER } from 'sql/parts/dashboard/containers/dashboardWebviewContainer.contribution';
import { MODELVIEW_CONTAINER } from 'sql/parts/dashboard/containers/dashboardModelViewContainer.contribution';
import { CONTROLHOST_CONTAINER } from 'sql/parts/dashboard/containers/dashboardControlHostContainer.contribution';
import { NAV_SECTION } from 'sql/parts/dashboard/containers/dashboardNavSection.contribution';
import { IDashboardContainerRegistry, Extensions as DashboardContainerExtensions, IDashboardContainer, registerContainerType } from 'sql/platform/dashboard/common/dashboardContainerRegistry';
import { IDashboardTab } from 'sql/platform/dashboard/common/dashboardRegistry';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';

const dashboardcontainerRegistry = Registry.as<IDashboardContainerRegistry>(DashboardContainerExtensions.dashboardContainerContributions);
const containerTypes = [
	WIDGETS_CONTAINER,
	GRID_CONTAINER,
	WEBVIEW_CONTAINER,
	MODELVIEW_CONTAINER,
	CONTROLHOST_CONTAINER,
	NAV_SECTION
];


/**
 * @returns whether the provided parameter is a JavaScript Array and each element in the array is a number.
 */
function isNumberArray(value: any): value is number[] {
	return types.isArray(value) && (<any[]>value).every(elem => types.isNumber(elem));
}

/**
 * Does a compare against the val passed in and the compare string
 * @param val string or array of strings to compare the compare value to; if array, it will compare each val in the array
 * @param compare value to compare to
 */
function stringOrStringArrayCompare(val: string | Array<string>, compare: string): boolean {
	if (types.isUndefinedOrNull(val)) {
		return true;
	} else if (types.isString(val)) {
		return val === compare;
	} else if (types.isStringArray(val)) {
		return val.some(item => item === compare);
	} else {
		return false;
	}
}

/**
 * Validates configs to make sure nothing will error out and returns the modified widgets
 * @param config Array of widgets to validate
 */
export function removeEmpty(config: WidgetConfig[]): Array<WidgetConfig> {
	return config.filter(widget => {
		return !types.isUndefinedOrNull(widget);
	});
}

/**
 * Validates configs to make sure nothing will error out and returns the modified widgets
 * @param config Array of widgets to validate
 */
export function validateGridConfig(config: WidgetConfig[], originalConfig: WidgetConfig[]): Array<WidgetConfig> {
	return config.map((widget, index) => {
		if (widget.gridItemConfig === undefined) {
			widget.gridItemConfig = {};
		}
		const id = generateUuid();
		widget.gridItemConfig.payload = { id };
		widget.id = id;
		if (originalConfig && originalConfig[index]) {
			originalConfig[index].id = id;
		}
		return widget;
	});
}

export function initExtensionConfigs(configurations: WidgetConfig[]): Array<WidgetConfig> {
	let widgetRegistry = <IInsightRegistry>Registry.as(Extensions.InsightContribution);
	return configurations.map((config) => {
		if (config.widget && Object.keys(config.widget).length === 1) {
			let key = Object.keys(config.widget)[0];
			let insightConfig = widgetRegistry.getRegisteredExtensionInsights(key);
			if (insightConfig !== undefined) {
				// Setup the default properties for this extension if needed
				if (!config.when && insightConfig.when) {
					config.when = insightConfig.when;
				}
				if (!config.gridItemConfig && insightConfig.gridItemConfig) {
					config.gridItemConfig = {
						sizex: insightConfig.gridItemConfig.x,
						sizey: insightConfig.gridItemConfig.y
					};
				}
				if (config.gridItemConfig && !config.gridItemConfig.sizex && insightConfig.gridItemConfig && insightConfig.gridItemConfig.x) {
					config.gridItemConfig.sizex = insightConfig.gridItemConfig.x;
				}
				if (config.gridItemConfig && !config.gridItemConfig.sizey && insightConfig.gridItemConfig && insightConfig.gridItemConfig.y) {
					config.gridItemConfig.sizey = insightConfig.gridItemConfig.y;
				}
			}
		}
		return config;
	});
}

/**
 * Add provider to the passed widgets and returns the new widgets
 * @param widgets Array of widgets to add provider onto
 */
export function addProvider(config: WidgetConfig[], dashboardService: DashboardServiceInterface): Array<WidgetConfig> {
	let provider = dashboardService.connectionManagementService.connectionInfo.providerId;
	return config.map((item) => {
		if (item.provider === undefined) {
			item.provider = provider;
		}
		return item;
	});
}

/**
 * Adds the edition to the passed widgets and returns the new widgets
 * @param widgets Array of widgets to add edition onto
 */
export function addEdition(config: WidgetConfig[], dashboardService: DashboardServiceInterface): Array<WidgetConfig> {
	let connectionInfo: ConnectionManagementInfo = dashboardService.connectionManagementService.connectionInfo;
	let edition = connectionInfo.serverInfo.engineEditionId;
	return config.map((item) => {
		if (item.edition === undefined) {
			item.edition = edition;
		}
		return item;
	});
}

/**
 * Adds the context to the passed widgets and returns the new widgets
 * @param widgets Array of widgets to add context to
 */
export function addContext(config: WidgetConfig[], dashboardServer: DashboardServiceInterface, context: string): Array<WidgetConfig> {
	return config.map((item) => {
		if (item.context === undefined) {
			item.context = context;
		}
		return item;
	});
}

/**
 * Returns a filtered version of the widgets passed based on edition and provider
 * @param config widgets to filter
 */
export function filterConfigs<T extends { when?: string }>(config: T[], dashboardService: DashboardServiceInterface): Array<T> {
	return config.filter((item) => {
		if (!item.when) {
			return true;
		} else {
			return dashboardService.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(item.when));
		}
	});
}

/**
 * Get registered container if it is specified as the key
 * @param container dashboard container
 */
export function getDashboardContainer(container: object): { result: boolean, message: string, container: object } {
	let key = Object.keys(container)[0];
	let containerTypeFound = containerTypes.find(c => (c === key));
	if (!containerTypeFound) {
		let dashboardContainer = dashboardcontainerRegistry.getRegisteredContainer(key);
		if (!dashboardContainer) {
			let errorMessage = nls.localize('unknownDashboardContainerError', '{0} is an unknown container.', key);
			error(errorMessage);
			return { result: false, message: errorMessage, container: null };
		} else {
			container = dashboardContainer.container;
		}
	}
	return { result: true, message: null, container: container };
}