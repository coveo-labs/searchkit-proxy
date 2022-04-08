import React, { Component } from "react";
import { EuiButton } from "@elastic/eui";

import CoveoUA from "./CoveoAnalytics";
import { serialize } from "v8";

interface ButtonProps {
  caption: string;
  results: any;
  action: buttonActionEnum;
  main: boolean;
  enabled: boolean;
  callback: any;
}

export enum buttonActionEnum {
  searchEvent = "SearchEvent",
  impressionsEvent = "ImpressionsEvent",
  viewEvent = "ViewEvent",
}

export class AddButton extends Component<ButtonProps> {
  createProductData(result: any) {
    let product = [];
    product["sku"] = result["permantentid"] || "";
    product["name"] = result["title"] || "";
    product["category"] = [result["type"] || ""];
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
    const searchUid =
      this.props.results.hits.items[0].fields["searchQueryUid"] || "";
    CoveoUA.emitUV("ecSearch", {
      type: "organic",
      outcome: "success",
      query: {
        id: CoveoUA.getQubitVisitor(),
        term: this.props.results.summary.query,
      },
      resultCount: this.props.results.summary.total,
      source: "proxy-search",
    });
  }

  addImpressionsEvent() {
    let products = [];
    const searchUid =
      this.props.results.hits.items[0].fields["searchQueryUid"] || "";
    if (searchUid !== "") {
      this.props.results.hits.items.forEach((product, index) => {
        const product_parsed = this.createProductData(product.fields);
        products.push(product_parsed["sku"]);
        CoveoUA.impressions(
          { ...product_parsed, position: index + 1 },
          searchUid
        );
      });
      coveoua("ec:setAction", "impression");
      coveoua("send", "event", CoveoUA.getOriginsAndCustomData());
    }
    this.addShown(products);
  }

  addShown(products: any) {
    CoveoUA.emitUV("ecSearchItemsShown", {
      type: "organic",
      outcome: "success",
      query: {
        id: CoveoUA.getQubitVisitor(),
        term: this.props.results.summary.query,
      },
      productIds: products,
    });
  }

  addView() {
    CoveoUA.logPageView();
    const language = "en-us",
      country = "US",
      currency = "USD";
    CoveoUA.emitUV("ecView", { type: "home", language, country, currency });
    CoveoUA.emitUser();
  }
  addAction() {
    if (this.props.main) {
      CoveoUA.setEcViewSent();
      if (this.props.callback) {
        this.props.callback();
      }
    }
    //check action type
    if (this.props.action === buttonActionEnum.searchEvent) {
      this.addSearchEvent();
    }
    //check action type
    if (this.props.action === buttonActionEnum.viewEvent) {
      this.addView();
    }
    if (this.props.action === buttonActionEnum.impressionsEvent) {
      this.addImpressionsEvent();
    }
  }
  render() {
    let enabled = this.props.enabled;

    if (this.props.main) {
      enabled = true;
    }
    return (
      <EuiButton
        style={{ marginRight: "10px" }}
        isDisabled={!enabled}
        onClick={() => this.addAction()}
      >
        {this.props.caption}
      </EuiButton>
    );
  }
}
export default AddButton;
