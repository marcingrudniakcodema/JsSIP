const Grammar = require("./Grammar");

module.exports = class WebSocketInterface {
  constructor(url, headers) {
    console.log('new() [url:"%s"]', url);

    this._url = url;
    this._sip_uri = null;
    this._via_transport = null;
    this._ws = null;
    this._headers = headers;

    const parsed_url = Grammar.parse(url, "absoluteURI");

    if (parsed_url === -1) {
      console.error(`invalid WebSocket URI: ${url}`);
      throw new TypeError(`Invalid argument: ${url}`);
    } else if (parsed_url.scheme !== "wss" && parsed_url.scheme !== "ws") {
      console.error(`invalid WebSocket URI scheme: ${parsed_url.scheme}`);
      throw new TypeError(`Invalid argument: ${url}`);
    } else {
      this._sip_uri = `sip:${parsed_url.host}${
        parsed_url.port ? `:${parsed_url.port}` : ""
      };transport=ws`;
      this._via_transport = parsed_url.scheme.toUpperCase();
    }
  }

  get via_transport() {
    return this._via_transport;
  }

  set via_transport(value) {
    this._via_transport = value.toUpperCase();
  }

  get sip_uri() {
    return this._sip_uri;
  }

  get url() {
    return this._url;
  }

  connect() {
    console.log("connect()");

    if (this.isConnected()) {
      console.log(`WebSocket ${this._url} is already connected`);

      return;
    } else if (this.isConnecting()) {
      console.log(`WebSocket ${this._url} is connecting`);

      return;
    }

    if (this._ws) {
      this.disconnect();
    }

    console.log(`connecting to WebSocket ${this._url}`);

    try {
      this._ws = new WebSocket(
        this._url,
        "sip",
        this._headers ? { headers: this._headers } : null
      );

      this._ws.binaryType = "arraybuffer";

      this._ws.onopen = this._onOpen.bind(this);
      this._ws.onclose = this._onClose.bind(this);
      this._ws.onmessage = this._onMessage.bind(this);
      this._ws.onerror = this._onError.bind(this);
    } catch (e) {
      this._onError(e);
    }
  }

  disconnect() {
    console.log("disconnect()");

    if (this._ws) {
      // Unbind websocket event callbacks.
      this._ws.onopen = () => {};
      this._ws.onclose = () => {};
      this._ws.onmessage = () => {};
      this._ws.onerror = () => {};

      this._ws.close();
      this._ws = null;
    }
  }

  send(message) {
    console.log("send()");

    if (this.isConnected()) {
      this._ws.send(message);

      return true;
    } else {
      console.error("unable to send message, WebSocket is not open");

      return false;
    }
  }

  isConnected() {
    return this._ws && this._ws.readyState === this._ws.OPEN;
  }

  isConnecting() {
    return this._ws && this._ws.readyState === this._ws.CONNECTING;
  }

  /**
   * WebSocket Event Handlers
   */

  _onOpen() {
    console.log(`WebSocket ${this._url} connected`);

    this.onconnect();
  }

  _onClose({ wasClean, code, reason }) {
    console.log(`WebSocket ${this._url} closed`);

    if (wasClean === false) {
      console.log("WebSocket abrupt disconnection");
    }

    const data = {
      socket: this,
      error: !wasClean,
      code,
      reason,
    };

    this.ondisconnect(data);
  }

  _onMessage({ data }) {
    console.log("received WebSocket message");

    this.ondata(data);
  }

  _onError(e) {
    console.error(`WebSocket ${this._url} error: ${e}`);
  }
};
