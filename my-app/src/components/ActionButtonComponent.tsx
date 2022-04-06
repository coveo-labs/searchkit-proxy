import React, { Component } from "react";
import { EuiButton } from "@elastic/eui";

import CoveoUA from "./CoveoAnalytics";
import { serialize } from "v8";

interface ButtonProps {
  caption: string;
  results: any;
  action: buttonActionEnum;
}

export enum buttonActionEnum {
  searchEvent = "SearchEvent",
  impressionsEvent = "ImpressionsEvent",
}

export class AddButton extends Component<ButtonProps> {
  createProductData(result: any) {
    let product = [];
    product["sku"] = result["permantentid"] || "";
    product["name"] = result["title"] || "";
    product["category"] = result["type"] || "";
    //We will use the imdbrating as a price
    product["price"] = result["imdbrating"] || 0.0;
    product["url"] = result["uri"] || "";
    product["image"] = result["poster"] || "";
    product["plot"] = result["plot"] || "";
    return product;
  }
  addSearchEvent() {
    const product = []; //this.createProductData();
    CoveoUA.sentSearchEvent(product);
  }

  addImpressionsEvent() {
    const searchUid =
      this.props.results.hits.items[0].fields["searchQueryUid"] || "";
    if (searchUid !== "") {
      this.props.results.hits.items.forEach((product, index) => {
        const product_parsed = this.createProductData(product.fields);
        CoveoUA.impressions(
          { ...product_parsed, position: index + 1 },
          searchUid
        );
      });
      coveoua("ec:setAction", "impression");
      coveoua("send", "event", CoveoUA.getOriginsAndCustomData());
    }
  }

  addAction() {
    //check action type
    if (this.props.action === buttonActionEnum.searchEvent) {
      this.addSearchEvent();
    }
    if (this.props.action === buttonActionEnum.impressionsEvent) {
      this.addImpressionsEvent();
    }
  }
  render() {
    return (
      <EuiButton
        style={{ marginRight: "10px" }}
        onClick={() => this.addAction()}
      >
        {this.props.caption}
      </EuiButton>
    );
  }
}
export default AddButton;
