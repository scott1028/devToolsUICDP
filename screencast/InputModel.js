// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';

export class InputModel extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);
    this._inputAgent = target.inputAgent();
    /** @type {?number} */
    this._activeTouchOffsetTop = null;
    this._activeTouchParams = null;
  }

  /**
   * @param {!Event} event
   */
  emitKeyEvent(event) {
    /** @type {!Protocol.Input.DispatchKeyEventRequestType} */
    let type;
    switch (event.type) {
      case 'keydown':
        type = Protocol.Input.DispatchKeyEventRequestType.KeyDown;
        break;
      case 'keyup':
        type = Protocol.Input.DispatchKeyEventRequestType.KeyUp;
        break;
      case 'keypress':
        type = Protocol.Input.DispatchKeyEventRequestType.Char;
        break;
      default:
        return;
    }

    const text = event.type === 'keypress' ? String.fromCharCode(event.charCode) : undefined;
    this._inputAgent.invoke_dispatchKeyEvent({
      type: type,
      modifiers: this._modifiersForEvent(event),
      text: text,
      unmodifiedText: text ? text.toLowerCase() : undefined,
      keyIdentifier: event.keyIdentifier,
      code: event.code,
      key: event.key,
      windowsVirtualKeyCode: event.keyCode,
      nativeVirtualKeyCode: event.keyCode,
      autoRepeat: false,
      isKeypad: false,
      isSystemKey: false
    });
  }

  /**
   * @param {!Event} event
   * @param {number} offsetTop
   * @param {number} zoom
   */
  emitTouchFromMouseEvent(event, offsetTop, zoom) {
    const buttons = {0: 'none', 1: 'left', 2: 'middle', 3: 'right'};
    const types = {
      // 'click': ['mousePressed', 'mouseReleased'],
      'mousedown': 'mousePressed',
      'mouseup': 'mouseReleased',
      'mousemove': 'mouseMoved',
      'mousewheel': 'mouseWheel'
    };
    console.log('emitTouchFromMouseEvent/event,event.type:', event, event.type);
    const x = Math.round(event.offsetX / zoom);
    let y = Math.round(event.offsetY / zoom);
    y = Math.round(y - this._activeTouchOffsetTop);
    const formatedType = types[event.type];
    if (formatedType) {
      const params = {
        type: formatedType,
        x: x,
        y: y,
        modifiers: this._modifiersForEvent(event),
        button: buttons[event.which],
        clickCount: formatedType === 'mousePressed' ? 1 : 0, // NOTE: make mouse click dom event triggered by scott
        // clickCount: 2,
      };
      // Special handler for mousehweel
      if (formatedType === 'mouseWheel') {
        params.deltaX = event.wheelDeltaX / zoom;
        params.deltaY = -event.wheelDeltaY / zoom;
      } else {
        this._activeTouchParams = params;
      }
      this._inputAgent.invoke_dispatchMouseEvent(params);
      console.log('emitTouchFromMouseEvent/params:', params);
    }
    console.log('emitTouchFromMouseEvent/event.type:', event.type);

    // if (!(event.type in types) || !(event.which in buttons)) {
    //   return;
    // }
    // if (event.type !== 'mousewheel' && buttons[event.which] === 'none') {
    //   return;
    // }

    // if (event.type === 'mousedown' || this._activeTouchOffsetTop === null) {
    //   this._activeTouchOffsetTop = offsetTop;
    // }

    // const x = Math.round(event.offsetX / zoom);
    // let y = Math.round(event.offsetY / zoom);
    // y = Math.round(y - this._activeTouchOffsetTop);
    // const params = {
    //   type: types[event.type],
    //   x: x,
    //   y: y,
    //   modifiers: this._modifiersForEvent(event),
    //   button: buttons[event.which],
    //   clickCount: 0
    // };
    // if (event.type === 'mousewheel') {
    //   params.deltaX = event.wheelDeltaX / zoom;
    //   params.deltaY = event.wheelDeltaY / zoom;
    // } else {
    //   this._activeTouchParams = params;
    // }
    // if (event.type === 'mouseup') {
    //   this._activeTouchOffsetTop = null;
    // }
    // // this._inputAgent.invoke_emulateTouchFromMouseEvent(params);
    // console.log('emitTouchFromMouseEvent/param:', params);
    // this._inputAgent.invoke_dispatchMouseEvent(params);
  }

  cancelTouch() {
    if (this._activeTouchParams !== null) {
      const params = this._activeTouchParams;
      this._activeTouchParams = null;
      params.type = 'mouseReleased';
      this._inputAgent.invoke_emulateTouchFromMouseEvent(params);
    }
  }

  /**
   * @param {!Event} event
   * @return {number}
   */
  _modifiersForEvent(event) {
    return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
  }
}

SDK.SDKModel.SDKModel.register(InputModel, SDK.SDKModel.Capability.Input, false);
