import React, { Component } from "react";
import { EuiButton } from "@elastic/eui";

import CoveoUA from "./CoveoAnalytics";

interface ButtonProps {
  caption: string;
  result: any;
  action: buttonResultActionEnum;
  main: boolean;
  summary: any;
  position: number;
  enabled: boolean;
}

interface ButtonState {
  result: any;
}

export enum buttonResultActionEnum {
  addToCart = "AddToCart",
  removeFromCart = "RemoveFromCart",
  addView = "AddView",
  purchase = "Purchase",
  addDetails = "AddDetails",
  addClick = "AddClick",
}

export class AddResultButton extends Component<ButtonProps, ButtonState> {
  constructor(props) {
    super(props);

    this.state = {
      result: this.props.result,
    };
  }

  createProductData() {
    let product = [];
    product["sku"] =
      this.props.result.fields["permanentid"] ||
      this.props.result.fields["id"] ||
      "";
    product["name"] = this.props.result.fields["title"] || "";
    product["category"] = [this.props.result.fields["type"] || ""];
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

  purchase() {
    const product = this.createProductData();
    const revenue = 0;
    const tax = 0;
    CoveoUA.addProductForPurchase(product);
    CoveoUA.setActionPurchase({
      id: this.props.result.fields["searchQueryUid"],
      revenue,
      shipping: 0,
      tax,
    });
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

  addClick() {
    const product = this.createProductData();
    CoveoUA.emitUV("ecSearchItemClick", {
      query: {
        id: CoveoUA.getQubitVisitor(),
        term: this.props.summary.query,
      },
      productId: product["sku"],
      position: this.props.position,
    });
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
    if (this.props.action === buttonResultActionEnum.purchase) {
      this.purchase();
    }
    if (this.props.action === buttonResultActionEnum.addClick) {
      this.addClick();
    }
  }

  componentDidUpdate() {
    //this.render();
  }

  render() {
    /*let enabled = CoveoUA.isEcViewSent();
    if (this.props.main) {
      enabled = true;
    }*/
    return (
      <EuiButton
        style={{ marginRight: "10px" }}
        isDisabled={!this.props.enabled}
        onClick={() => this.addAction()}
      >
        {this.props.caption}
      </EuiButton>
    );
  }
}
export default AddResultButton;
