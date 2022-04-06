import React, { Component } from "react";
import { EuiButton } from "@elastic/eui";

import CoveoUA from "./CoveoAnalytics";

interface ButtonProps {
  caption: string;
  result: any;
  action: buttonResultActionEnum;
}

export enum buttonResultActionEnum {
  addToCart = "AddToCart",
  removeFromCart = "RemoveFromCart",
  addView = "AddView",
  addDetails = "AddDetails",
}

export class AddResultButton extends Component<ButtonProps> {
  createProductData() {
    let product = [];
    product["sku"] =
      this.props.result.fields["permanentid"] ||
      this.props.result.fields["id"] ||
      "";
    product["name"] = this.props.result.fields["title"] || "";
    product["category"] = this.props.result.fields["type"] || "";
    //We will use the imdbrating as a price
    product["price"] = this.props.result.fields["imdbrating"] || 0.0;
    product["url"] =
      this.props.result.fields["uri"] || this.props.result.fields["id"] || "";
    product["image"] = this.props.result.fields["poster"] || "";
    product["plot"] = this.props.result.fields["plot"] || "";
    return product;
  }
  addToCart() {
    const product = this.createProductData();
    CoveoUA.addToCart(product);
  }

  removeFromCart() {
    const product = this.createProductData();
    CoveoUA.removeFromCart(product);
  }

  addView() {
    CoveoUA.logPageView();
    const language = "en-us",
      country = "US",
      currency = "USD";
    CoveoUA.emitUV("ecView", { type: "home", language, country, currency });
    CoveoUA.emitUser();
  }

  addDetails() {
    //Detailed page
    const product = this.createProductData();

    let sku = product["sku"] || "";
    let url = product["url"];
    let stock = 1;
    CoveoUA.emitUV("ecProduct", {
      product: {
        productId: sku,
        sku,
        originalPrice: {
          value: product["price"],
          currency: "USD",
        },
        price: {
          value: product["price"],
          currency: "USD",
        },
        name: product["name"],
        category: product["category"],
        categories: [product["category"]],
        url: url,
        images: [product["image"]],
        description: product["plot"],
        stock,
      },
      eventType: "detail",
    });

    CoveoUA.emitBasket();
  }

  addAction() {
    //check action type
    if (this.props.action === buttonResultActionEnum.addDetails) {
      this.addDetails();
    }
    if (this.props.action === buttonResultActionEnum.addToCart) {
      this.addToCart();
    }
    if (this.props.action === buttonResultActionEnum.addView) {
      this.addView();
    }
    if (this.props.action === buttonResultActionEnum.removeFromCart) {
      this.removeFromCart();
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
export default AddResultButton;
