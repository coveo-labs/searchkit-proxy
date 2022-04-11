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
  updateCart: boolean;
}

interface ButtonState {
  result: any;
  count: number;
}

export enum buttonResultActionEnum {
  addToCart = "AddToCart",
  removeFromCart = "RemoveFromCart",
  addView = "AddView",
  addDetails = "AddDetails",
  addClick = "AddClick",
}

export class AddResultButton extends Component<ButtonProps, ButtonState> {
  constructor(props) {
    super(props);
    const cartItems = CoveoUA.getCart();

    this.state = {
      result: this.props.result,
      count: cartItems.length,
    };
  }

  createProductData() {
    let product = {};
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
    product["id"] = product["sku"];
    return product;
  }
  addToCart() {
    const searchUid = this.props.result.fields["searchQueryUid"];
    let cart = CoveoUA.getCart();
    const product = this.createProductData();
    //@ts-ignore
    CoveoUA.addToCart([product]);
    cart.push(product);
    CoveoUA.setCart(cart);
    CoveoUA.emitBasket(searchUid, cart, "add", product);
    this.setState({ count: cart.length });
    //Also UV action
  }

  removeFromCart() {
    let cart = CoveoUA.getCart();
    const searchUid = this.props.result.fields["searchQueryUid"];
    const product = this.createProductData();
    //@ts-ignore
    CoveoUA.removeFromCart(product);
    for (var i = 0; i < cart.length; i++) {
      if (cart[i]["sku"] === product["sku"]) {
        cart.splice(i, 1);
        //Sent the UA event
        CoveoUA.emitBasket(searchUid, cart, "remove", product);
        i--;
      }
    }
    //cart.remove(product);
    CoveoUA.setCart(cart);
    this.setState({ count: cart.length });
    //Also UV action
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

    //CoveoUA.emitBasket();
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
    let caption = this.props.caption;
    if (this.props.updateCart) {
      caption += " (" + this.state.count + ")";
    }

    return (
      <EuiButton
        style={{ marginRight: "10px" }}
        isDisabled={!this.props.enabled}
        onClick={() => this.addAction()}
      >
        {caption}
      </EuiButton>
    );
  }
}
export default AddResultButton;
