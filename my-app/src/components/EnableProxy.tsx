import React, { Component } from "react";
import { EuiTitle } from "@elastic/eui";
import CoveoUA from "./CoveoAnalytics";

import {
  getQubitTrackerId,
  getQubitExperienceIdParameter,
  getHostCoveo,
  getHostElastic,
} from "./settings";

interface EnableProxyProps {
  enableCaption: string;
  disableCaption: string;
  setHost: any;
};

interface EnableProxyState {
  enabled: boolean;
  executed: boolean;
};

export class EnableProxy extends Component<EnableProxyProps, EnableProxyState> {
  private caption: string;
  _isMounted = false;
  enableCoveo = false;
  callbackUrl = "";

  constructor(props) {
    super(props);

    this.state = {
      enabled: false,
      executed: false,
    };
  }

  async getResponse(url: string, method: string) {
    const request = new Request(url);

    const response = await fetch(request, { method: method });
    const results = await response.json();
    return results;
  }

  async checkSearchEnablement() {
    this.enableCoveo = false;
    //Check with https://sse.qubit.com/ if we need to enable Elastic or Coveo
    //We only do this once for each session
    let contextId = "";

    //Call sse
    //with &preview --> you will always get the Variantion defined
    const url = `https://sse.qubit.com/v1/${getQubitTrackerId()}/experiences?${contextId}&${getQubitExperienceIdParameter()}`;
    const response = await this.getResponse(url, "GET");
    console.log("From EnableProxy.tsx");
    console.log("SSE Response: ", response);
    if (response?.experiencePayloads?.length > 0) {
      response.experiencePayloads.forEach((experience) => {
        //isControl: false means there will be no payload
        const { callback } = experience;
        fetch(callback, { method: 'POST' });

        if (experience?.payload?.enableCoveo === true) {
          this.enableCoveo = true;
        }
      });
      //Store the contextId as key
      if (contextId === "") {
        CoveoUA.setCookie("_qubitTracker", response["contextId"], 365);
      }
    }
    if (this._isMounted) {
      this.setState({ enabled: this.enableCoveo, executed: true });
    }
  }

  componentDidMount() {
    this._isMounted = true;
    //get the current state from SSE
    if (!this.state.executed) {
      this.checkSearchEnablement();
      this.setState({ enabled: this.enableCoveo, executed: true });
    } else {
      this.setState({ enabled: this.enableCoveo, executed: false });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if (this._isMounted) {
      if (this.state.enabled) {
        this.caption = this.props.enableCaption;
        this.props.setHost(getHostCoveo());
      } else {
        this.caption = this.props.disableCaption;
        this.props.setHost(getHostElastic());
      }
    }
  }

  render() {
    return (
      <EuiTitle size="xs">
        <div className="EnableProxyIndicator">{this.caption}</div>
      </EuiTitle>
    );
  }
}
export default EnableProxy;
