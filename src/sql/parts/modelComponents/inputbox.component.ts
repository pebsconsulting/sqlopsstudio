/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	Component, Input, Inject, ChangeDetectorRef, forwardRef, ComponentFactoryResolver,
	ViewChild, ViewChildren, ElementRef, Injector, OnDestroy, QueryList, AfterViewInit
} from '@angular/core';

import * as sqlops from 'sqlops';
import Event, { Emitter } from 'vs/base/common/event';
import * as nls from 'vs/nls';

import { ComponentBase } from 'sql/parts/modelComponents/componentBase';
import { IComponent, IComponentDescriptor, IModelStore, ComponentEventType } from 'sql/parts/modelComponents/interfaces';
import { InputBox, IInputOptions, MessageType } from 'vs/base/browser/ui/inputbox/inputBox';
import { CommonServiceInterface } from 'sql/services/common/commonServiceInterface.service';
import { attachInputBoxStyler, attachListStyler } from 'vs/platform/theme/common/styler';

@Component({
	selector: 'inputBox',
	template: `
		<div #input style="width: 100%"></div>
	`
})
export default class InputBoxComponent extends ComponentBase implements IComponent, OnDestroy, AfterViewInit {
	@Input() descriptor: IComponentDescriptor;
	@Input() modelStore: IModelStore;
	private _input: InputBox;

	@ViewChild('input', { read: ElementRef }) private _inputContainer: ElementRef;
	constructor(
		@Inject(forwardRef(() => CommonServiceInterface)) private _commonService: CommonServiceInterface,
		@Inject(forwardRef(() => ChangeDetectorRef)) changeRef: ChangeDetectorRef) {
		super(changeRef);
	}

	ngOnInit(): void {
		this.baseInit();

	}

	ngAfterViewInit(): void {
		if (this._inputContainer) {
			let inputOptions: IInputOptions = {
				placeholder: '',
				ariaLabel: '',
				validationOptions: {
					validation: () => {
						if (this.valid) {
							return undefined;
						} else {
							return {
								content: nls.localize('invalidValueError', 'Invalid value'),
								type: MessageType.ERROR
							};
						}
					}
				}
			};

			this._input = new InputBox(this._inputContainer.nativeElement, this._commonService.contextViewService, inputOptions);

			this._register(this._input);
			this._register(attachInputBoxStyler(this._input, this._commonService.themeService));
			this._register(this._input.onDidChange(e => {
				this.value = this._input.value;
				this._onEventEmitter.fire({
					eventType: ComponentEventType.onDidChange,
					args: e
				});
			}));
		}
	}

	ngOnDestroy(): void {
		this.baseDestroy();
	}

	/// IComponent implementation

	public layout(): void {
		this._changeRef.detectChanges();
	}

	public setLayout(layout: any): void {
		// TODO allow configuring the look and feel
		this.layout();
	}

	public setProperties(properties: { [key: string]: any; }): void {
		super.setProperties(properties);
		this._input.value = this.value;
		this._input.setAriaLabel(this.ariaLabel);
		this._input.setPlaceHolder(this.placeHolder);
		this._input.setEnabled(this.enabled);
		if (this.width) {
			this._input.width = this.width;
		}
	}

	public setValid(valid: boolean): void {
		super.setValid(valid);
		this._input.validate();
	}

	// CSS-bound properties

	public get value(): string {
		return this.getPropertyOrDefault<sqlops.InputBoxProperties, string>((props) => props.value, '');
	}

	public set value(newValue: string) {
		this.setPropertyFromUI<sqlops.InputBoxProperties, string>((props, value) => props.value = value, newValue);
	}

	public get ariaLabel(): string {
		return this.getPropertyOrDefault<sqlops.InputBoxProperties, string>((props) => props.ariaLabel, '');
	}

	public set ariaLabel(newValue: string) {
		this.setPropertyFromUI<sqlops.InputBoxProperties, string>((props, value) => props.ariaLabel = value, newValue);
	}

	public get placeHolder(): string {
		return this.getPropertyOrDefault<sqlops.InputBoxProperties, string>((props) => props.placeHolder, '');
	}

	public set placeHolder(newValue: string) {
		this.setPropertyFromUI<sqlops.InputBoxProperties, string>((props, value) => props.placeHolder = value, newValue);
	}

	public get height(): number {
		return this.getPropertyOrDefault<sqlops.InputBoxProperties, number>((props) => props.height, undefined);
	}

	public set height(newValue: number) {
		this.setPropertyFromUI<sqlops.InputBoxProperties, number>((props, value) => props.height = value, newValue);
	}

	public get width(): number {
		return this.getPropertyOrDefault<sqlops.InputBoxProperties, number>((props) => props.width, undefined);
	}

	public set width(newValue: number) {
		this.setPropertyFromUI<sqlops.InputBoxProperties, number>((props, value) => props.width = value, newValue);
	}
}
